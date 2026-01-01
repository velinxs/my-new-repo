// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title WorkToken
 * @dev Proof of Useful Work Token - AI labor backed cryptocurrency
 *
 * This token is minted based on verified AI agent labor (compute tokens used).
 * The oracle (backend) submits proofs of completed tasks, and tokens are minted
 * proportional to the compute work done.
 */
contract WorkToken is ERC20, Ownable {

    // Mint rate: LLM compute tokens to chain tokens conversion
    // e.g., 1000 means 1 LLM token = 0.001 chain tokens
    uint256 public mintRate;

    // Oracle address that can submit proofs (your backend)
    address public oracle;

    // Track submitted proofs to prevent double-minting
    mapping(bytes32 => bool) public proofSubmitted;

    // Track agent balances before withdrawal
    mapping(address => uint256) public agentBalances;

    // Events
    event WorkProofSubmitted(
        bytes32 indexed taskId,
        address indexed agent,
        uint256 computeTokens,
        uint256 tokensToMint
    );

    event AgentWithdrawal(
        address indexed agent,
        uint256 amount
    );

    event MintRateUpdated(uint256 oldRate, uint256 newRate);
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);

    /**
     * @dev Constructor
     * @param _name Token name (e.g., "WorkToken")
     * @param _symbol Token symbol (e.g., "WORK")
     * @param _mintRate Initial mint rate (compute tokens per chain token)
     * @param _oracle Oracle address (your backend wallet)
     */
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _mintRate,
        address _oracle
    ) ERC20(_name, _symbol) Ownable(msg.sender) {
        require(_mintRate > 0, "Mint rate must be > 0");
        require(_oracle != address(0), "Invalid oracle address");

        mintRate = _mintRate;
        oracle = _oracle;
    }

    /**
     * @dev Submit proof of work completed by an agent
     * Only callable by oracle (backend)
     *
     * @param taskId Unique task identifier (hashed)
     * @param computeTokens Number of LLM compute tokens used
     * @param outputHash Hash of the task output (for verification)
     * @param agent Agent's wallet address
     */
    function submitProof(
        bytes32 taskId,
        uint256 computeTokens,
        bytes32 outputHash,
        address agent
    ) external onlyOracle {
        require(!proofSubmitted[taskId], "Proof already submitted");
        require(agent != address(0), "Invalid agent address");
        require(computeTokens > 0, "Compute tokens must be > 0");

        // Mark proof as submitted
        proofSubmitted[taskId] = true;

        // Calculate tokens to mint based on compute work done
        uint256 tokensToMint = computeTokens * mintRate;

        // Credit agent's balance
        agentBalances[agent] += tokensToMint;

        emit WorkProofSubmitted(taskId, agent, computeTokens, tokensToMint);
    }

    /**
     * @dev Agent withdraws their earned tokens
     * Mints tokens and transfers to agent
     */
    function withdraw() external {
        uint256 amount = agentBalances[msg.sender];
        require(amount > 0, "No balance to withdraw");

        // Reset balance before minting (reentrancy protection)
        agentBalances[msg.sender] = 0;

        // Mint tokens to agent
        _mint(msg.sender, amount);

        emit AgentWithdrawal(msg.sender, amount);
    }

    /**
     * @dev Get agent's pending balance (not yet withdrawn)
     */
    function getAgentBalance(address agent) external view returns (uint256) {
        return agentBalances[agent];
    }

    /**
     * @dev Check if a proof has been submitted
     */
    function isProofSubmitted(bytes32 taskId) external view returns (bool) {
        return proofSubmitted[taskId];
    }

    /**
     * @dev Update mint rate (owner only)
     */
    function setMintRate(uint256 _mintRate) external onlyOwner {
        require(_mintRate > 0, "Mint rate must be > 0");
        uint256 oldRate = mintRate;
        mintRate = _mintRate;
        emit MintRateUpdated(oldRate, _mintRate);
    }

    /**
     * @dev Update oracle address (owner only)
     */
    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Invalid oracle address");
        address oldOracle = oracle;
        oracle = _oracle;
        emit OracleUpdated(oldOracle, _oracle);
    }

    /**
     * @dev Modifier to restrict functions to oracle only
     */
    modifier onlyOracle() {
        require(msg.sender == oracle, "Only oracle can call this");
        _;
    }
}
