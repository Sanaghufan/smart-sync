import React, { useEffect, useState } from 'react';
import Web3 from 'web3';

const Agenda = ({ interviews = [], currentExpert }) => {
  const [scores, setScores] = useState({});
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [account, setAccount] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const contractABI = [];
  const contractAddress = ''; // Your contract address here
  
  useEffect(() => {
    if (errorMessage || successMessage) {
      const timer = setTimeout(() => {
        // Clear the messages after 3 seconds
        setErrorMessage("");
        setSuccessMessage("");
      }, 3000);

      // Cleanup timer on component unmount or when messages change
      return () => clearTimeout(timer);
    }
  }, [errorMessage, successMessage]);

  const handleConnectWallet = async () => {
    console.log("Attempting to connect to MetaMask...");

    if (window.ethereum) {
      try {
        console.log("Ethereum provider found.");
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const web3 = new Web3(window.ethereum);
        const accounts = await web3.eth.getAccounts();
        console.log("Accounts fetched:", accounts);

        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setSuccessMessage('Wallet connected successfully!');
        } else {
          console.error("No accounts found.");
          setErrorMessage('No accounts found. Please ensure your MetaMask is set up correctly.');
        }
      } catch (error) {
        console.error("Connection error:", error);
        if (error.code === 4001) {
          setErrorMessage('Connection request was rejected. Please try again.');
        } else {
          setErrorMessage('Failed to connect wallet: ' + error.message);
        }
      }
    } else {
      console.error("Ethereum provider not found.");
      setErrorMessage('Ethereum provider not found. Please install MetaMask.');
    }
  };

  const candidateIdMapping = {};
  let currentId = 0;

  const getCandidateId = (boardTitle, expertName, candidateName) => {
    const uniqueKey = `${boardTitle}_${expertName}_${candidateName}`;
    if (!candidateIdMapping[uniqueKey]) {
      candidateIdMapping[uniqueKey] = currentId++;
    }
    return candidateIdMapping[uniqueKey];
  };

  const handleScoreChange = (interviewIndex, candidate, param, value) => {
    setScores((prevScores) => ({
      ...prevScores,
      [interviewIndex]: {
        ...prevScores[interviewIndex],
        [candidate]: {
          ...prevScores[interviewIndex]?.[candidate],
          [param]: value,
        },
      },
    }));
  };

  const openScoringModal = (interview) => {
    setSelectedInterview(interview);
    setIsModalOpen(true);
  };

  const closeScoringModal = () => {
    setSelectedInterview(null);
    setIsModalOpen(false);
  };

  const handleSubmitReview = async () => {
    if (!account) {
      setErrorMessage('No wallet connected. Please connect your MetaMask.');
      return;
    }

    try {
      const web3 = new Web3(window.ethereum);
      const contract = new web3.eth.Contract(contractABI, contractAddress);

      if (selectedInterview) {
        const { requirement: boardTitle, experts } = selectedInterview;
        const expertData = experts.find((expert) => expert.name === currentExpert);

        if (!expertData) {
          setErrorMessage('Current expert data not found.');
          return;
        }

        // Use a temporary list of 3 candidates for testing
        const candidatesToReview = expertData.candidates.slice(0, 3);
        let isAnyFeedbackGiven = false;

        for (const candidate of candidatesToReview) {
          const candidateName = candidate.Candidate;
          const { skills, experience, engagement: communication } = scores[selectedInterview._id]?.[candidateName] || {};

          if (
            skills >= 0 &&
            skills <= 10 &&
            experience >= 0 &&
            experience <= 10 &&
            communication >= 0 &&
            communication <= 10
          ) {
            isAnyFeedbackGiven = true;
            const candidateId = getCandidateId(boardTitle, currentExpert, candidateName);

            await contract.methods.giveFeedback(candidateId, skills, experience, communication).send({ from: account });
            setSuccessMessage(`Feedbacks submitted successfully.`);
          }
        }

        if (!isAnyFeedbackGiven) {
          setErrorMessage('No feedback was provided. Please fill in scores for the candidates.');
        }

        closeScoringModal();
      } else {
        setErrorMessage('No interview selected for scoring.');
      }
    } catch (error) {
      setErrorMessage('An error occurred while submitting the review: ' + error.message);
    }
  };

  return (
    <div className="w-full p-4">
      {!account ? (
        <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" onClick={handleConnectWallet}>Connect Wallet</button>
      ) : (
        <>
          <div className="border-b pb-2 mb-4">
            <button className="mr-4 border-b-2 border-blue-500 font-semibold">My Agenda</button>
          </div>
  
          {interviews.length === 0 ? (
            <p>No upcoming interviews</p>
          ) : (
            interviews.map((interview, index) => {
              const formattedDate = new Date(interview.date);
              const day = formattedDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
              const date = formattedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase();
              const time = formattedDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
  
              const expertData = interview.experts.find((expert) => expert.name === currentExpert);
  
              if (!expertData) return null;
  
              return (
                <div key={index} className="mb-8">
                  <div className="flex items-center mb-4">
                    <div className="w-1/4 text-center">
                      <div className="text-lg font-semibold">{day}</div>
                      <div className="text-sm">{date}</div>
                    </div>
                    <div className="w-3/6">
                      <div className="text-blue-600">Interview for {interview.requirement}</div>
                      <div className="text-gray-500">Scheduled Interview</div>
                    </div>
                    <div className="w-1/2 flex items-center justify-end space-x-2">
                      <div className="text-sm">{time}</div>
                      <button
                        onClick={() => openScoringModal(interview)}
                        className="ml-4 bg-blue-500 text-white px-6 py-1 rounded hover:bg-blue-600 ml-8"
                      >
                        Scoring
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
  
          {/* Error or Success Messages */}
          {errorMessage && <div className="text-red-500">{errorMessage}</div>}
          {successMessage && <div className="text-green-500">{successMessage}</div>}
  
          {/* Scoring Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 shadow-lg">
                <h2 className="text-lg font-semibold mb-4">Scoring for {selectedInterview.requirement}</h2>
                <ul>
                  {selectedInterview.experts.find((expert) => expert.name === currentExpert)?.candidates?.slice(0, 3).map(
                    (candidate, index) => (
                      <li key={index} className="mb-4">
                        <h3 className="font-semibold">{candidate.Candidate}</h3>
                        <div className="mt-2">
                          <table className="table-auto w-full border">
                            <thead>
                              <tr>
                                <th className="px-4 py-2 border">Skills</th>
                                <th className="px-4 py-2 border">Experience</th>
                                <th className="px-4 py-2 border">Communication</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="px-4 py-2 border">
                                  <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    className="border px-2 py-1 w-full"
                                    value={scores[selectedInterview._id]?.[candidate.Candidate]?.skills || ''}
                                    onChange={(e) =>
                                      handleScoreChange(selectedInterview._id, candidate.Candidate, 'skills', parseInt(e.target.value, 10))
                                    }
                                  />
                                </td>
                                <td className="px-4 py-2 border">
                                  <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    className="border px-2 py-1 w-full"
                                    value={scores[selectedInterview._id]?.[candidate.Candidate]?.experience || ''}
                                    onChange={(e) =>
                                      handleScoreChange(selectedInterview._id, candidate.Candidate, 'experience', parseInt(e.target.value, 10))
                                    }
                                  />
                                </td>
                                <td className="px-4 py-2 border">
                                  <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    className="border px-2 py-1 w-full"
                                    value={scores[selectedInterview._id]?.[candidate.Candidate]?.engagement || ''}
                                    onChange={(e) =>
                                      handleScoreChange(selectedInterview._id, candidate.Candidate, 'engagement', parseInt(e.target.value, 10))
                                    }
                                  />
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </li>
                    )
                  )}
                </ul>
                <div className="flex justify-end mt-4">
                  <button onClick={closeScoringModal} className="mr-2 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancel</button>
                  <button onClick={() => {handleSubmitReview();
                  closeScoringModal();}}  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Submit</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
export default Agenda;
  