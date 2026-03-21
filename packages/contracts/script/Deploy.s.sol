// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script, console2} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {ProofLinkRegistry} from "../src/ProofLinkRegistry.sol";
import {FlowLinkKYA} from "../src/FlowLinkKYA.sol";
import {AgentInvoice} from "../src/AgentInvoice.sol";
import {FlowLinkFacilitator} from "../src/FlowLinkFacilitator.sol";

/// @title Deploy
/// @notice Deployment script for FlowLink contracts on Base Sepolia.
/// @dev Run with: forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast --verify
contract Deploy is Script {
    // ── Base Sepolia EAS addresses ──
    address constant EAS_ADDRESS = 0x4200000000000000000000000000000000000021;
    address constant SCHEMA_REGISTRY_ADDRESS = 0x4200000000000000000000000000000000000020;

    // ── Placeholder ERC-8004 addresses (replace with actual deployments) ──
    address constant IDENTITY_REGISTRY = address(0); // Set before mainnet deploy
    address constant VALIDATION_REGISTRY = address(0); // Set before mainnet deploy

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("Deployer:", deployer);
        console2.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerPrivateKey);

        // ── 1. Deploy ProofLinkRegistry ──
        ProofLinkRegistry registryImpl = new ProofLinkRegistry();
        bytes memory registryInit = abi.encodeCall(
            ProofLinkRegistry.initialize, (EAS_ADDRESS, SCHEMA_REGISTRY_ADDRESS, deployer)
        );
        ERC1967Proxy registryProxy = new ERC1967Proxy(address(registryImpl), registryInit);
        ProofLinkRegistry registry = ProofLinkRegistry(address(registryProxy));
        console2.log("ProofLinkRegistry proxy:", address(registryProxy));
        console2.log("ProofLinkRegistry impl:", address(registryImpl));

        // Register EAS schema
        bytes32 schemaUID = registry.registerSchema();
        console2.log("EAS Schema UID:");
        console2.logBytes32(schemaUID);

        // ── 2. Deploy FlowLinkKYA ──
        // Use deployer as placeholder identity registry if actual one is not yet deployed
        address identityRegistryAddr = IDENTITY_REGISTRY == address(0) ? deployer : IDENTITY_REGISTRY;
        address validationRegistryAddr = VALIDATION_REGISTRY;

        FlowLinkKYA kyaImpl = new FlowLinkKYA();
        bytes memory kyaInit = abi.encodeCall(
            FlowLinkKYA.initialize, (identityRegistryAddr, validationRegistryAddr, deployer)
        );
        ERC1967Proxy kyaProxy = new ERC1967Proxy(address(kyaImpl), kyaInit);
        FlowLinkKYA kyaContract = FlowLinkKYA(address(kyaProxy));
        console2.log("FlowLinkKYA proxy:", address(kyaProxy));
        console2.log("FlowLinkKYA impl:", address(kyaImpl));

        // ── 3. Deploy AgentInvoice ──
        AgentInvoice invoiceImpl = new AgentInvoice();
        bytes memory invoiceInit = abi.encodeCall(AgentInvoice.initialize, (deployer));
        ERC1967Proxy invoiceProxy = new ERC1967Proxy(address(invoiceImpl), invoiceInit);
        console2.log("AgentInvoice proxy:", address(invoiceProxy));
        console2.log("AgentInvoice impl:", address(invoiceImpl));

        // ── 4. Deploy FlowLinkFacilitator ──
        FlowLinkFacilitator facImpl = new FlowLinkFacilitator();
        bytes memory facInit = abi.encodeCall(
            FlowLinkFacilitator.initialize, (address(registryProxy), address(kyaProxy), deployer)
        );
        ERC1967Proxy facProxy = new ERC1967Proxy(address(facImpl), facInit);
        FlowLinkFacilitator facilitator = FlowLinkFacilitator(address(facProxy));
        console2.log("FlowLinkFacilitator proxy:", address(facProxy));
        console2.log("FlowLinkFacilitator impl:", address(facImpl));

        // ── 5. Configure cross-contract roles ──
        // Grant facilitator the ATTESTER_ROLE on ProofLinkRegistry
        registry.grantRole(registry.ATTESTER_ROLE(), address(facProxy));

        // Grant facilitator the FACILITATOR_ROLE on AgentInvoice
        AgentInvoice(address(invoiceProxy)).grantRole(
            AgentInvoice(address(invoiceProxy)).FACILITATOR_ROLE(), address(facProxy)
        );

        console2.log("");
        console2.log("=== Deployment Complete ===");
        console2.log("ProofLinkRegistry:", address(registryProxy));
        console2.log("FlowLinkKYA:", address(kyaProxy));
        console2.log("AgentInvoice:", address(invoiceProxy));
        console2.log("FlowLinkFacilitator:", address(facProxy));

        vm.stopBroadcast();
    }
}
