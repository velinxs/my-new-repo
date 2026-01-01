#!/bin/bash

# WorkToken Deployment Script
# Deploys the WorkToken contract to Base Sepolia (testnet)

set -e

echo "=================================="
echo "WorkToken Deployment Script"
echo "=================================="

# Check if .env file exists
if [ ! -f ../.env ]; then
    echo "Error: .env file not found"
    echo "Please create a .env file with:"
    echo "  - RPC_URL (Base Sepolia RPC)"
    echo "  - ORACLE_PRIVATE_KEY (Deployer private key)"
    exit 1
fi

# Load environment variables
source ../.env

# Contract parameters
TOKEN_NAME="WorkToken"
TOKEN_SYMBOL="WORK"
MINT_RATE="1"  # 1 LLM token = 1 chain token (adjust as needed)

# Oracle address (derived from private key)
ORACLE_ADDRESS=$(cast wallet address --private-key $ORACLE_PRIVATE_KEY)

echo ""
echo "Deployment Parameters:"
echo "  Token Name: $TOKEN_NAME"
echo "  Token Symbol: $TOKEN_SYMBOL"
echo "  Mint Rate: $MINT_RATE"
echo "  Oracle Address: $ORACLE_ADDRESS"
echo "  Network: Base Sepolia"
echo ""

read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 1
fi

echo ""
echo "Installing dependencies..."
forge install OpenZeppelin/openzeppelin-contracts --no-commit

echo ""
echo "Deploying contract..."

# Deploy contract
forge create WorkToken \
    --rpc-url $RPC_URL \
    --private-key $ORACLE_PRIVATE_KEY \
    --constructor-args "$TOKEN_NAME" "$TOKEN_SYMBOL" $MINT_RATE $ORACLE_ADDRESS \
    --verify

echo ""
echo "=================================="
echo "Deployment complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Copy the deployed contract address"
echo "2. Add CONTRACT_ADDRESS=<address> to your .env file"
echo "3. Restart the backend services"
echo ""
