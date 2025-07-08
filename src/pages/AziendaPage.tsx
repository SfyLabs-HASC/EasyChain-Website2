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
  prepareEvent,
  parseEventLogs,
} from "thirdweb";
import { polygon } from "thirdweb/chains";
import { inAppWallet } from "thirdweb/wallets";
import { supplyChainABI as abi } from "../abi/contractABI";
import "../App.css";

import TransactionStatusModal from "../components/TransactionStatusModal";

// --- Inline CSS Styles ---
const AziendaPageStyles = () => (
  <style>{`
    ... // (Il tuo CSS rimane invariato, omesso qui per brevità)
  `}</style>
);

const CLIENT_ID = "e40dfd747fabedf48c5837fb79caf2eb";
const CONTRACT_ADDRESS =
  "0x2bd72307a73cc7be3f275a81c8edbe775bb08f3e";

const client = createThirdwebClient({
  clientId: CLIENT_ID,
});
const contract = getContract({
  client,
  chain: polygon,
  address: CONTRACT_ADDRESS,
});

const RegistrationForm = () => (
  <div className="card">
    <h3>Benvenuto su Easy Chain!</h3>
    <p>
      Il tuo account non è ancora attivo. Compila il form di
      registrazione per inviare una richiesta di
      attivazione.
    </p>
  </div>
);

const BatchRow = ({ batch, localId }) => {
  const [showDescription, setShowDescription] =
    useState(false);
  const { data: stepCount } = useReadContract({
    contract,
    abi,
    method:
      "function getBatchStepCount(uint256 _batchId) view returns (uint256)",
    params: [batch.batchId],
  });
  const formatDate = (dateStr) =>
    !dateStr || dateStr.split("-").length !== 3
      ? "/"
      : dateStr.split("-").reverse().join("/");

  return (
    <>
      {/* ... Resto componente BatchRow come prima ... */}
      {/* Questa parte NON va cambiata */}
    </>
  );
};

const BatchTable = ({
  batches,
  nameFilter,
  setNameFilter,
  locationFilter,
  setLocationFilter,
  statusFilter,
  setStatusFilter,
}) => {
  /* ... Come nel tuo codice (table + paginazione) ... */
};

const DashboardHeader = ({
  contributorInfo,
  onNewInscriptionClick,
}) => {
  /* ... Come nel tuo codice ... */
};

const getInitialFormData = () => ({
  name: "",
  description: "",
  date: "",
  location: "",
});
const truncateText = (text, maxLength) =>
  !text
    ? text
    : text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;

export default function AziendaPage() {
  const account = useActiveAccount();
  const {
    data: contributorData,
    isLoading: isStatusLoading,
    refetch: refetchContributorInfo,
    isError,
  } = useReadContract({
    contract,
    method:
      "function getContributorInfo(address) view returns (string, uint256, bool)",
    params: account ? [account.address] : undefined,
    queryOptions: { enabled: !!account },
  });
  const prevAccountRef = useRef(account?.address);
  const { mutate: sendTransaction, isPending } =
    useSendTransaction();
  const [modal, setModal] = useState(null);
  const [formData, setFormData] = useState(
    getInitialFormData(),
  );
  const [selectedFile, setSelectedFile] = useState(null);
  const [txResult, setTxResult] = useState(null);
  const [allBatches, setAllBatches] = useState([]);
  const [filteredBatches, setFilteredBatches] = useState(
    [],
  );
  const [isLoadingBatches, setIsLoadingBatches] =
    useState(true);
  const [nameFilter, setNameFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loadingMessage, setLoadingMessage] = useState("");
  const [currentStep, setCurrentStep] = useState(1);

  // ---- 👇 AGGIORNATO: DECODIFICA EVENTI USANDO parseEventLogs ----
  const fetchAllBatches = async () => {
    if (!account?.address) return;
    setIsLoadingBatches(true);

    const insightUrl = `https://polygon.insight.thirdweb.com/v1/events`;
    const params = new URLSearchParams({
      contract_address: CONTRACT_ADDRESS,
      event_signature:
        "BatchInitialized(address,uint256,string,string,string,string,string,string,bool)",
      "filters[contributor]": account.address,
      limit: "1000",
    });

    try {
      const response = await fetch(
        `${insightUrl}?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "x-thirdweb-client-id": CLIENT_ID,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error(
          "Dettagli errore API da Insight:",
          errorData,
        );
        throw new Error(
          `Errore API di Insight: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      // Prepara l'evento secondo la nuova logica thirdweb:
      const batchInitializedEvent = prepareEvent({
        abi,
        signature:
          "event BatchInitialized(address,uint256,string,string,string,string,string,string,bool)",
      });

      // Decodifica tutti i log tramite il decoder ufficiale
      const parsedEvents = parseEventLogs({
        logs: data.result,
        events: [batchInitializedEvent],
      });

      const formattedBatches = parsedEvents.map(
        (event) => ({
          id: event.args.batchId.toString(),
          batchId: BigInt(event.args.batchId),
          name: event.args.name,
          description: event.args.description,
          date: event.args.date,
          location: event.args.location,
          isClosed: event.args.isClosed,
        }),
      );

      setAllBatches(
        formattedBatches.sort(
          (a, b) => Number(b.batchId) - Number(a.batchId),
        ),
      );
    } catch (error) {
      console.error(
        "Errore nel caricare i lotti da Insight:",
        error,
      );
      setAllBatches([]);
    } finally {
      setIsLoadingBatches(false);
    }
  };
  // ---- FINE BLOCCO MODIFICATO ----

  useEffect(() => {
    if (account?.address) {
      if (prevAccountRef.current !== account.address) {
        refetchContributorInfo();
      }
      fetchAllBatches();
    } else if (!account && prevAccountRef.current) {
      window.location.href = "/";
    }
    prevAccountRef.current = account?.address;
  }, [account]);

  useEffect(() => {
    let tempBatches = [...allBatches];
    if (nameFilter)
      tempBatches = tempBatches.filter((b) =>
        b.name
          .toLowerCase()
          .includes(nameFilter.toLowerCase()),
      );
    if (locationFilter)
      tempBatches = tempBatches.filter((b) =>
        b.location
          .toLowerCase()
          .includes(locationFilter.toLowerCase()),
      );
    if (statusFilter !== "all") {
      const isOpen = statusFilter === "open";
      tempBatches = tempBatches.filter(
        (b) => !b.isClosed === isOpen,
      );
    }
    setFilteredBatches(tempBatches);
  }, [
    nameFilter,
    locationFilter,
    statusFilter,
    allBatches,
  ]);

  const handleModalInputChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };
  const handleFileChange = (e) => {
    setSelectedFile(e.target.files?.[0] || null);
  };

  const handleInitializeBatch = async () => {
    if (!formData.name.trim()) {
      setTxResult({
        status: "error",
        message: "Il campo Nome è obbligatorio.",
      });
      return;
    }
    setLoadingMessage("Preparazione transazione...");
    let imageIpfsHash = "N/A";
    if (selectedFile) {
      const MAX_SIZE_MB = 5;
      const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
      const ALLOWED_FORMATS = [
        "image/png",
        "image/jpeg",
        "image/webp",
      ];
      if (selectedFile.size > MAX_SIZE_BYTES) {
        setTxResult({
          status: "error",
          message: `File troppo grande. Limite: ${MAX_SIZE_MB} MB.`,
        });
        return;
      }
      if (!ALLOWED_FORMATS.includes(selectedFile.type)) {
        setTxResult({
          status: "error",
          message: "Formato immagine non supportato.",
        });
        return;
      }
      setLoadingMessage("Caricamento Immagine...");
      try {
        const body = new FormData();
        body.append("file", selectedFile);
        body.append(
          "companyName",
          contributorData?.[0] || "AziendaGenerica",
        );
        const response = await fetch("/api/upload", {
          method: "POST",
          body,
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.details ||
              "Errore dal server di upload.",
          );
        }
        const { cid } = await response.json();
        if (!cid)
          throw new Error(
            "CID non ricevuto dall'API di upload.",
          );
        imageIpfsHash = cid;
      } catch (error) {
        setTxResult({
          status: "error",
          message: `Errore caricamento: ${error.message}`,
        });
        setLoadingMessage("");
        return;
      }
    }
    setLoadingMessage("Transazione in corso...");
    const transaction = prepareContractCall({
      contract,
      abi,
      method:
        "function initializeBatch(string,string,string,string,string)",
      params: [
        formData.name,
        formData.description,
        formData.date,
        formData.location,
        imageIpfsHash,
      ],
    });
    sendTransaction(transaction, {
      onSuccess: async () => {
        setTxResult({
          status: "success",
          message: "Iscrizione creata con successo!",
        });
        setTimeout(() => {
          fetchAllBatches();
          refetchContributorInfo();
        }, 2000);
        setLoadingMessage("");
      },
      onError: (err) => {
        setTxResult({
          status: "error",
          message: err.message
            .toLowerCase()
            .includes("insufficient funds")
            ? "Crediti Insufficienti, Ricarica"
            : "Errore nella transazione.",
        });
        setLoadingMessage("");
      },
    });
  };

  const openModal = () => {
    setFormData(getInitialFormData());
    setSelectedFile(null);
    setCurrentStep(1);
    setTxResult(null);
    setModal("init");
  };
  const handleCloseModal = () => setModal(null);
  const handleNextStep = () => {
    if (currentStep === 1 && !formData.name.trim()) {
      alert("Il campo 'Nome Iscrizione' è obbligatorio.");
      return;
    }
    if (currentStep < 6) setCurrentStep((prev) => prev + 1);
  };
  const handlePrevStep = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  };

  if (!account) {
    return (
      <div className="login-container">
        <AziendaPageStyles />
        <ConnectButton
          client={client}
          chain={polygon}
          accountAbstraction={{
            chain: polygon,
            sponsorGas: true,
          }}
          wallets={[inAppWallet()]}
          connectButton={{
            label: "Connettiti / Log In",
            style: {
              fontSize: "1.2rem",
              padding: "1rem 2rem",
            },
          }}
        />
      </div>
    );
  }

  // ... Resto della funzione (render, modale, ecc...) invariato ...
}
