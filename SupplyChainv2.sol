// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SupplyChainV2
 * @author Gemini & Tu
 * @notice Versione semplificata del contratto SupplyChain. 1 transazione = 1 credito.
 * @dev Creato per blockchain EVM come Polygon. Aggiornato per Thirdweb Insight.
 */
contract SupplyChainV2 {
    address public superOwner;
    address public owner;
    uint256 private batchCounter;

    struct Contributor {
        string name;
        uint256 credits;
        bool isActive;
    }

    struct Step {
        string eventName;
        string description;
        string date;
        string location;
        string attachmentsIpfsHash;
    }

    struct Batch {
        uint256 id;
        address contributor;
        string contributorName;
        string name;            
        string description;
        string date;
        string location;
        string imageIpfsHash;
        bool isClosed;
        Step[] steps;
    }

    mapping(address => Contributor) public contributors;
    mapping(uint256 => Batch) public batches;
    mapping(address => uint256[]) public contributorBatches;

    event SuperOwnerChanged(address indexed oldSuperOwner, address indexed newSuperOwner);
    event OwnerSet(address indexed oldOwner, address indexed newOwner);
    event ContributorAdded(address indexed contributorAddress, string name);
    event ContributorStatusChanged(address indexed contributorAddress, bool isActive);
    event ContributorCreditsSet(address indexed contributorAddress, uint256 newCreditBalance);
    
    // Evento BatchInitialized arricchito con tutti i dati necessari per Insight
    event BatchInitialized(
        address indexed contributor,
        uint256 indexed batchId,
        string name,
        string description,
        string date,
        string location,
        string imageIpfsHash,
        string contributorName,
        bool isClosed
    );
    
    // Evento BatchStepAdded arricchito con tutti i dati necessari per Insight
    event BatchStepAdded(
        uint256 indexed batchId,
        uint256 stepIndex,
        string eventName,
        string description,
        string date,
        string location,
        string attachmentsIpfsHash
    );

    event BatchClosed(address indexed contributor, uint256 indexed batchId);

    modifier onlySuperOwner() {
        require(msg.sender == superOwner, "Caller is not the SuperOwner");
        _;
    }

    modifier onlySuperOwnerOrOwner() {
        require(msg.sender == superOwner || msg.sender == owner, "Caller is not SuperOwner or Owner");
        _;
    }

    modifier onlyActiveContributor() {
        require(contributors[msg.sender].isActive, "Caller is not an active contributor");
        require(contributors[msg.sender].credits > 0, "Contributor has no credits");
        _;
    }

    constructor() {
        superOwner = msg.sender;
        emit SuperOwnerChanged(address(0), msg.sender);
    }

    // --- Funzioni di amministrazione (invariate) ---
    function setOwner(address _newOwner) external onlySuperOwner {
        address oldOwner = owner;
        owner = _newOwner;
        emit OwnerSet(oldOwner, _newOwner);
    }

    function addContributor(address _contributorAddress, string memory _name) external onlySuperOwnerOrOwner {
        require(_contributorAddress != address(0), "Invalid address");
        Contributor storage contributor = contributors[_contributorAddress];
        if (!contributor.isActive) {
            contributor.isActive = true;
            emit ContributorStatusChanged(_contributorAddress, true);
        }
        contributor.name = _name;
        emit ContributorAdded(_contributorAddress, _name);
    }
    
    function deactivateContributor(address _contributorAddress) external onlySuperOwnerOrOwner {
        require(contributors[_contributorAddress].isActive, "Contributor already inactive");
        contributors[_contributorAddress].isActive = false;
        emit ContributorStatusChanged(_contributorAddress, false);
    }

    function setContributorCredits(address _contributorAddress, uint256 _credits) external onlySuperOwnerOrOwner {
        require(contributors[_contributorAddress].isActive, "Contributor is not active");
        contributors[_contributorAddress].credits = _credits;
        emit ContributorCreditsSet(_contributorAddress, _credits);
    }

    // --- Funzioni principali (con emit modificati) ---
    function initializeBatch(
        string memory _name,
        string memory _description,
        string memory _date,
        string memory _location,
        string memory _imageIpfsHash
    ) external onlyActiveContributor {
        contributors[msg.sender].credits--;
        emit ContributorCreditsSet(msg.sender, contributors[msg.sender].credits);

        batchCounter++;
        uint256 newBatchId = batchCounter;
        
        Batch storage newBatch = batches[newBatchId];
        newBatch.id = newBatchId;
        newBatch.contributor = msg.sender;
        newBatch.contributorName = contributors[msg.sender].name;
        newBatch.name = _name;
        newBatch.description = _description;
        newBatch.date = _date;
        newBatch.location = _location;
        newBatch.imageIpfsHash = _imageIpfsHash;
        newBatch.isClosed = false;
        contributorBatches[msg.sender].push(newBatchId);

        // Emissione dell'evento arricchito
        emit BatchInitialized(
            msg.sender,
            newBatchId,
            _name,
            _description,
            _date,
            _location,
            _imageIpfsHash,
            newBatch.contributorName,
            false
        );
    }

    function addStepToBatch(
        uint256 _batchId,
        string memory _eventName,
        string memory _description,
        string memory _date,
        string memory _location,
        string memory _attachmentsIpfsHash
    ) external onlyActiveContributor {
        contributors[msg.sender].credits--;
        emit ContributorCreditsSet(msg.sender, contributors[msg.sender].credits);
        
        Batch storage batch = batches[_batchId];
        require(batch.id != 0, "Batch does not exist");
        require(batch.contributor == msg.sender, "Caller is not the batch owner");
        require(!batch.isClosed, "Batch is already closed");

        batch.steps.push(Step({
            eventName: _eventName,
            description: _description,
            date: _date,
            location: _location,
            attachmentsIpfsHash: _attachmentsIpfsHash
        }));

        // Emissione dell'evento arricchito
        emit BatchStepAdded(
            _batchId,
            batch.steps.length - 1,
            _eventName,
            _description,
            _date,
            _location,
            _attachmentsIpfsHash
        );
    }

    function closeBatch(uint256 _batchId) external onlyActiveContributor {
        contributors[msg.sender].credits--;
        emit ContributorCreditsSet(msg.sender, contributors[msg.sender].credits);

        Batch storage batch = batches[_batchId];
        require(batch.id != 0, "Batch does not exist");
        require(batch.contributor == msg.sender, "Caller is not the batch owner");
        require(!batch.isClosed, "Batch is already closed");

        batch.isClosed = true;

        emit BatchClosed(msg.sender, _batchId);
    }
    
    // --- Funzioni View (invariate, rimangono utili per controlli o fallback) ---
    function getContributorInfo(address _contributorAddress) external view returns (string memory, uint256, bool) {
        Contributor storage c = contributors[_contributorAddress];
        return (c.name, c.credits, c.isActive);
    }
    
    function getBatchesByContributor(address _contributor) external view returns (uint256[] memory) {
        return contributorBatches[_contributor];
    }
    
    function getBatchInfo(
        uint256 _batchId
    ) 
        external 
        view 
        returns (
            uint256 id, 
            address contributor, 
            string memory contributorName, 
            string memory name, 
            string memory description, 
            string memory date, 
            string memory location, 
            string memory imageIpfsHash, 
            bool isClosed
        ) 
    {
        Batch storage b = batches[_batchId];
        return (
            b.id, 
            b.contributor, 
            b.contributorName,
            b.name, 
            b.description, 
            b.date, 
            b.location, 
            b.imageIpfsHash, 
            b.isClosed
        );
    }
    
    function getBatchStepCount(uint256 _batchId) external view returns (uint256) {
        require(batches[_batchId].id != 0, "Batch does not exist");
        return batches[_batchId].steps.length;
    }
    
    function getBatchStep(uint256 _batchId, uint256 _stepIndex) external view returns (string memory, string memory, string memory, string memory, string memory) {
        require(batches[_batchId].id != 0, "Batch does not exist");
        Step storage s = batches[_batchId].steps[_stepIndex];
        return (s.eventName, s.description, s.date, s.location, s.attachmentsIpfsHash);
    }
}