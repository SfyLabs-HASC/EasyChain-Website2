import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ConnectButton,
  useActiveAccount,
  useReadContract,
  useSendTransaction,
} from "thirdweb/react";
import {
  createThirdwebClient,
  getContract,
  prepareContractCall,
} from "thirdweb"; // NESSUN decodeEventLog qui
import { polygon } from "thirdweb/chains";
import { inAppWallet } from "thirdweb/wallets";
import { supplyChainABI as abi } from "../abi/contractABI";
import "../App.css";
import TransactionStatusModal from "../components/TransactionStatusModal";

// ... (tutto il codice degli stili e dei componenti UI invariato)

export default function AziendaPage() {
  const account = useActiveAccount();
  const { data: contributorData, isLoading: isStatusLoading, refetch: refetchContributorInfo } = useReadContract({ contract, method: "function getContributorInfo(address) view returns (string, uint256, bool)", params: account ? [account.address] : undefined, queryOptions: { enabled: !!account } });
  const [allBatches, setAllBatches] = useState<BatchData[]>([]);
  // ... (tutti gli altri state hooks invariati)

  const fetchAllBatches = async () => {
    if (!account?.address) return;
    setIsLoadingBatches(true);

    try {
      const response = await fetch(`/api/thirdweb-insight?address=${account.address}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Errore dal server proxy: ${response.status} - ${errorText}`);
      }
      
      const decodedEvents = await response.json();

      // Il backend ha già decodificato i dati, li usiamo direttamente
      const formattedBatches: BatchData[] = decodedEvents.map((args: any) => ({
        id: args.batchId.toString(),
        batchId: BigInt(args.batchId),
        name: args.name,
        description: args.description,
        date: args.date,
        location: args.location,
        isClosed: args.isClosed,
      }));

      setAllBatches(formattedBatches.sort((a, b) => Number(b.batchId) - Number(a.batchId)));

    } catch (error) {
      console.error("ERRORE FINALE:", error);
      setAllBatches([]);
    } finally {
      setIsLoadingBatches(false);
    }
  };

  // ... (tutto il resto del componente, useEffects, handlers e JSX è invariato)
}