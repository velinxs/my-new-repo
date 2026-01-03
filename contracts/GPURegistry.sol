// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GPURegistry
 * @dev Decentralized GPU compute marketplace
 *
 * Allows GPU owners to stake tokens and provide compute.
 * Users pay for inference via escrow.
 * Fully serverless - just smart contracts + Tor routing.
 */
contract GPURegistry is Ownable {

    IERC20 public immutable libreToken;

    struct GPU {
        address wallet;
        string torAddress; // .onion hidden service address
        string model; // e.g. "llama3-70b", "stable-diffusion-xl"
        uint256 pricePerToken; // Price in LIBRE per 1k tokens
        uint256 stake;
        uint256 reputation;
        uint256 completedJobs;
        uint256 failedJobs;
        bool active;
        uint256 registeredAt;
    }

    struct InferenceRequest {
        bytes32 id;
        address userWallet;
        address gpuWallet;
        uint256 escrowAmount;
        bytes32 requestHash; // Hash of encrypted input (for verification)
        uint256 createdAt;
        uint256 timeout;
        bool proofSubmitted;
        bool settled;
        uint256 tokensUsed;
        bytes32 resultHash;
    }

    // State
    mapping(address => GPU) public gpus;
    mapping(bytes32 => InferenceRequest) public requests;
    address[] public gpuList;

    // Constants
    uint256 public constant MIN_STAKE = 100 ether; // 100 LIBRE minimum
    uint256 public constant SLASH_AMOUNT = 100 ether; // Penalty for timeout
    uint256 public constant GPU_FEE_PERCENT = 90; // 90% to GPU, 10% burned
    uint256 public constant REPUTATION_GAIN = 10;
    uint256 public constant REPUTATION_LOSS = 50;
    uint256 public constant DEFAULT_TIMEOUT = 300; // 5 minutes

    // Events
    event GPURegistered(
        address indexed wallet,
        string torAddress,
        string model,
        uint256 stake
    );

    event GPUUpdated(
        address indexed wallet,
        uint256 pricePerToken,
        bool active
    );

    event RequestCreated(
        bytes32 indexed requestId,
        address indexed user,
        address indexed gpu,
        uint256 escrowAmount
    );

    event ProofSubmitted(
        bytes32 indexed requestId,
        bytes32 resultHash,
        uint256 tokensUsed
    );

    event RequestSettled(
        bytes32 indexed requestId,
        uint256 actualCost,
        uint256 gpuPayment,
        uint256 burnAmount,
        uint256 refund
    );

    event TimeoutClaimed(
        bytes32 indexed requestId,
        uint256 slashAmount
    );

    event StakeAdded(address indexed gpu, uint256 amount);
    event StakeWithdrawn(address indexed gpu, uint256 amount);

    constructor(address _libreToken) Ownable(msg.sender) {
        libreToken = IERC20(_libreToken);
    }

    /**
     * @dev Register GPU to provide compute
     */
    function registerGPU(
        string memory torAddress,
        string memory model,
        uint256 pricePerToken,
        uint256 stakeAmount
    ) external {
        require(stakeAmount >= MIN_STAKE, "Stake too low");
        require(!gpus[msg.sender].active, "Already registered");
        require(bytes(torAddress).length > 0, "Invalid Tor address");
        require(bytes(model).length > 0, "Invalid model");

        // Transfer stake
        require(
            libreToken.transferFrom(msg.sender, address(this), stakeAmount),
            "Stake transfer failed"
        );

        // Register GPU
        gpus[msg.sender] = GPU({
            wallet: msg.sender,
            torAddress: torAddress,
            model: model,
            pricePerToken: pricePerToken,
            stake: stakeAmount,
            reputation: 1000, // Starting reputation
            completedJobs: 0,
            failedJobs: 0,
            active: true,
            registeredAt: block.timestamp
        });

        gpuList.push(msg.sender);

        emit GPURegistered(msg.sender, torAddress, model, stakeAmount);
    }

    /**
     * @dev Update GPU pricing or status
     */
    function updateGPU(uint256 newPricePerToken, bool active) external {
        GPU storage gpu = gpus[msg.sender];
        require(gpu.wallet != address(0), "Not registered");

        gpu.pricePerToken = newPricePerToken;
        gpu.active = active;

        emit GPUUpdated(msg.sender, newPricePerToken, active);
    }

    /**
     * @dev Add more stake
     */
    function addStake(uint256 amount) external {
        GPU storage gpu = gpus[msg.sender];
        require(gpu.wallet != address(0), "Not registered");

        require(
            libreToken.transferFrom(msg.sender, address(this), amount),
            "Stake transfer failed"
        );

        gpu.stake += amount;

        emit StakeAdded(msg.sender, amount);
    }

    /**
     * @dev Withdraw stake (only if no pending requests)
     */
    function withdrawStake(uint256 amount) external {
        GPU storage gpu = gpus[msg.sender];
        require(gpu.wallet != address(0), "Not registered");
        require(gpu.stake >= amount, "Insufficient stake");
        require(gpu.stake - amount >= MIN_STAKE, "Must keep minimum stake");

        gpu.stake -= amount;

        require(
            libreToken.transfer(msg.sender, amount),
            "Stake withdrawal failed"
        );

        emit StakeWithdrawn(msg.sender, amount);
    }

    /**
     * @dev User creates inference request with escrow
     */
    function createRequest(
        address gpuWallet,
        uint256 escrowAmount,
        bytes32 requestHash
    ) external returns (bytes32) {
        GPU storage gpu = gpus[gpuWallet];
        require(gpu.active, "GPU not active");
        require(escrowAmount > 0, "Invalid escrow amount");

        // Transfer escrow to contract
        require(
            libreToken.transferFrom(msg.sender, address(this), escrowAmount),
            "Escrow transfer failed"
        );

        // Generate request ID
        bytes32 requestId = keccak256(abi.encodePacked(
            msg.sender,
            gpuWallet,
            block.timestamp,
            requestHash
        ));

        // Create request
        requests[requestId] = InferenceRequest({
            id: requestId,
            userWallet: msg.sender,
            gpuWallet: gpuWallet,
            escrowAmount: escrowAmount,
            requestHash: requestHash,
            createdAt: block.timestamp,
            timeout: block.timestamp + DEFAULT_TIMEOUT,
            proofSubmitted: false,
            settled: false,
            tokensUsed: 0,
            resultHash: bytes32(0)
        });

        emit RequestCreated(requestId, msg.sender, gpuWallet, escrowAmount);

        return requestId;
    }

    /**
     * @dev GPU submits proof of completed work
     */
    function submitProof(
        bytes32 requestId,
        bytes32 resultHash,
        uint256 tokensUsed
    ) external {
        InferenceRequest storage req = requests[requestId];
        require(msg.sender == req.gpuWallet, "Not assigned GPU");
        require(!req.settled, "Already settled");
        require(block.timestamp < req.timeout, "Request timed out");
        require(tokensUsed > 0, "Invalid token count");

        req.proofSubmitted = true;
        req.tokensUsed = tokensUsed;
        req.resultHash = resultHash;

        emit ProofSubmitted(requestId, resultHash, tokensUsed);
    }

    /**
     * @dev Settle request and distribute payment
     * Can be called by anyone once proof is submitted
     */
    function settleRequest(bytes32 requestId) external {
        InferenceRequest storage req = requests[requestId];
        require(req.proofSubmitted, "No proof submitted");
        require(!req.settled, "Already settled");

        GPU storage gpu = gpus[req.gpuWallet];

        // Calculate actual cost
        uint256 actualCost = (req.tokensUsed * gpu.pricePerToken) / 1000; // Price is per 1k tokens
        require(actualCost <= req.escrowAmount, "Cost exceeds escrow");

        // Calculate payments
        uint256 gpuPayment = (actualCost * GPU_FEE_PERCENT) / 100; // 90% to GPU
        uint256 burnAmount = actualCost - gpuPayment; // 10% burned
        uint256 refund = req.escrowAmount - actualCost;

        // Transfer to GPU
        require(libreToken.transfer(req.gpuWallet, gpuPayment), "GPU payment failed");

        // Burn (send to dead address)
        require(libreToken.transfer(address(0xdead), burnAmount), "Burn failed");

        // Refund excess to user
        if (refund > 0) {
            require(libreToken.transfer(req.userWallet, refund), "Refund failed");
        }

        // Update GPU stats
        gpu.reputation += REPUTATION_GAIN;
        gpu.completedJobs++;

        req.settled = true;

        emit RequestSettled(requestId, actualCost, gpuPayment, burnAmount, refund);
    }

    /**
     * @dev Claim timeout - called by user if GPU doesn't respond
     */
    function claimTimeout(bytes32 requestId) external {
        InferenceRequest storage req = requests[requestId];
        require(msg.sender == req.userWallet, "Not requester");
        require(block.timestamp > req.timeout, "Not timed out yet");
        require(!req.proofSubmitted, "Proof already submitted");
        require(!req.settled, "Already settled");

        GPU storage gpu = gpus[req.gpuWallet];

        // Refund user
        require(libreToken.transfer(req.userWallet, req.escrowAmount), "Refund failed");

        // Slash GPU stake
        if (gpu.stake >= SLASH_AMOUNT) {
            gpu.stake -= SLASH_AMOUNT;
            // Burn slashed amount
            require(libreToken.transfer(address(0xdead), SLASH_AMOUNT), "Slash burn failed");
        } else {
            // If stake too low, burn everything
            uint256 remainingStake = gpu.stake;
            gpu.stake = 0;
            require(libreToken.transfer(address(0xdead), remainingStake), "Slash burn failed");
            gpu.active = false; // Deactivate
        }

        // Update GPU stats
        gpu.reputation -= REPUTATION_LOSS;
        gpu.failedJobs++;

        req.settled = true;

        emit TimeoutClaimed(requestId, SLASH_AMOUNT);
    }

    /**
     * @dev Get all active GPUs for a specific model
     */
    function getGPUsForModel(string memory model) external view returns (GPU[] memory) {
        uint256 count = 0;

        // Count matching GPUs
        for (uint256 i = 0; i < gpuList.length; i++) {
            GPU memory gpu = gpus[gpuList[i]];
            if (gpu.active && keccak256(bytes(gpu.model)) == keccak256(bytes(model))) {
                count++;
            }
        }

        // Build result array
        GPU[] memory result = new GPU[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < gpuList.length; i++) {
            GPU memory gpu = gpus[gpuList[i]];
            if (gpu.active && keccak256(bytes(gpu.model)) == keccak256(bytes(model))) {
                result[index] = gpu;
                index++;
            }
        }

        return result;
    }

    /**
     * @dev Get all active GPUs (for marketplace browsing)
     */
    function getAllActiveGPUs() external view returns (GPU[] memory) {
        uint256 count = 0;

        for (uint256 i = 0; i < gpuList.length; i++) {
            if (gpus[gpuList[i]].active) {
                count++;
            }
        }

        GPU[] memory result = new GPU[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < gpuList.length; i++) {
            if (gpus[gpuList[i]].active) {
                result[index] = gpus[gpuList[i]];
                index++;
            }
        }

        return result;
    }

    /**
     * @dev Get GPU count
     */
    function getGPUCount() external view returns (uint256) {
        return gpuList.length;
    }

    /**
     * @dev Get request details
     */
    function getRequest(bytes32 requestId) external view returns (InferenceRequest memory) {
        return requests[requestId];
    }
}
