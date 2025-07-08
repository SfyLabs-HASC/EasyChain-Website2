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
  decodeEventLog, // Usiamo la funzione qui, nel frontend
} from "thirdweb";
import { polygon } from "thirdweb/chains";
import { inAppWallet } from "thirdweb/wallets";
import { supplyChainABI as abi } from "../abi/contractABI";
import "../App.css";
import TransactionStatusModal from "../components/TransactionStatusModal";

// ... (tutti gli stili e i componenti UI rimangono invariati)

const CLIENT_ID = "34087f86e3a1c30b5fbf54150c052b45";
const CONTRACT_ADDRESS = "0x2bd72307a73cc7be3f275a81c8edbe775bb08f3e";

const client = createThirdwebClient({ clientId: CLIENT_ID });
const contract = getContract({ client, chain: polygon, address: CONTRACT_ADDRESS });

// ... (Tutti i componenti come BatchRow, BatchTable, DashboardHeader, etc., rimangono invariati)

export default function AziendaPage() {
  const account = useActiveAccount();
  const { data: contributorData, isLoading: isStatusLoading, refetch: refetchContributorInfo } = useReadContract({ contract, method: "function getContributorInfo(address) view returns (string, uint256, bool)", params: account ? [account.address] : undefined, queryOptions: { enabled: !!account } });
  // ... (tutti gli altri state hooks rimangono invariati)
  const [allBatches, setAllBatches] = useState<BatchData[]>([]);

  const fetchAllBatches = async () => {
    if (!account?.address) return;
    setIsLoadingBatches(true);

    try {
      const response = await fetch(`/api/thirdweb-insight?address=${account.address}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Errore dal server proxy: ${response.status} - ${errorText}`);
      }

      const rawEvents = await response.json();

      const batchInitializedEventAbi = abi.find(
        (item) => item.type === "event" && item.name === "BatchInitialized"
      );
      if (!batchInitializedEventAbi) throw new Error("ABI per BatchInitialized non trovata.");
      
      const formattedBatches = rawEvents.map((event: any) => {
        const decodedLog = decodeEventLog({
          // @ts-ignore
          event: batchInitializedEventAbi,
          data: event.data,
          topics: event.topics,
        });
        const args = decodedLog.args as any;
        return {
          id: args.batchId.toString(),
          batchId: BigInt(args.batchId),
          name: args.name,
          description: args.description,
          date: args.date,
          location: args.location,
          isClosed: args.isClosed,
        };
      });

      setAllBatches(formattedBatches.sort((a, b) => Number(b.batchId) - Number(a.batchId)));

    } catch (error) {
      console.error("ERRORE FINALE:", error);
      setAllBatches([]);
    } finally {
      setIsLoadingBatches(false);
    }
  };

  // ... (tutto il resto del componente, useEffect, handlers, e JSX rimane invariato)
}