import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import dicomParser from 'dicom-parser';
import { uploadDicomFolder, addMetadataToStudy } from './dicom_helpers';
import { auth } from '../firebase';



const serverUrl =
  window.location.hostname === 'localhost'
    ? 'https://localhost:3443' // Local development
    : 'https://medsyn.katelyncmorrison.com'; // Deployed server
const orthancServerUrl =
  window.location.hostname === 'localhost'
    ? 'http://localhost'
    : 'https://orthanc.katelyncmorrison.com';

const SearchHomePage = () => {
  const [inputValue, setInputValue] = useState('');
  const [isModelRunning, setIsModelRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [oldModelIsRunning, setOldModelIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dataIsUploading, setDataIsUploading] = useState(false);
  const [generateClicked, setGenerateClicked] = useState(false);
  const [isServerRunning, setIsServerRunning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingFileSeriesInstanceUID, setGeneratingFileSeriesInstanceUID] = useState('');
  const [generatingFilePrompt, setGeneratingFilePrompt] = useState('');
  const [generatedFileID, setGeneratedFileID] = useState(''); // Store the generated file ID
  const [studyID, setStudyId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const checkModelIsRunning = async () => {
      try {
        const response = await axios.get(`${serverUrl}/status`);

        if (response.status === 200) {
          const processIsRunning = response.data['process_is_running'];
          const progressPercentage = response.data['progress'] || 0;
          console.log('CHECK MODEL IS RUNNING: ', response.data);
          setProgress(progressPercentage);
          setIsModelRunning(prevModelIsRunning => {
            if (prevModelIsRunning === false && processIsRunning === true) {
              console.log('Model started');
            } else if (prevModelIsRunning === true && processIsRunning === false) {
              console.log('Model ended');
              console.log('Try to download data');
              console.log('Generated File ID:', generatedFileID);
              executeDownloadAndUpload(studyID);
            }
            setOldModelIsRunning(prevModelIsRunning);
            return processIsRunning;
          });
        }
      } catch (error) {
        console.log('Error checking for model status:', error);
        setLogs(prevLogs => [...prevLogs, `Error checking for model status: ${error.message}`]);
      }
    };
    checkModelIsRunning();
    const interval = setInterval(() => {
      checkModelIsRunning();
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval); // Cleanup on component unmount
  }, [studyID]); // Add generatedFileID as a dependency

  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const response = await axios.get(serverUrl);
        console.log('Server status response:', response.data);
        if (response.data['server_running'] === true) {
          setIsServerRunning(true);
          console.log('Server is running');
        } else {
          setIsServerRunning(false);
        }
      } catch (error) {
        console.error('Error checking server status:', error);
        setIsServerRunning(false);
      }
    };

    checkServerStatus();
    const interval = setInterval(() => {
      checkServerStatus();
    }, 60000); // Check every 60 seconds

    return () => clearInterval(interval); // Cleanup on component unmount
  }, []);

  useEffect(() => {
    const getServerLog = async () => {
      if (isModelRunning) {
        try {
          const response = await axios.get(`${serverUrl}/progress`);
          if (response.status === 200) {
            setLogs(prevLogs => [...prevLogs, `Model progress: ${response.data}`]);
          }
        } catch (error) {
          console.log('Error when getting server log:', error);
        }
      }
    };

    const interval = setInterval(getServerLog, 3000); // Check every 5 seconds

    return () => clearInterval(interval); // Cleanup on component unmount
  }, [isModelRunning]);

  // Trigger model generation and wait until completion
  const handleGenerateClick = async () => {
    if (isGenerating) {
      setIsGenerating(false);
      setIsLoading(false);
      setGenerateClicked(false);
      setLogs(prevLogs => [...prevLogs, 'Generation process stopped.']);
      return;
    }

    setIsLoading(true);
    setGenerateClicked(true); // Flag generation started
    setIsGenerating(true); // Set generating state to true
    setLogs(['Starting CT scan generation...']);

    const formattedDate = generateUniqueTimestamp();
    const firstTenLetters = inputValue.replace(/[^a-zA-Z]/g, '').slice(0, 10);
    const newGeneratedFileID = `${formattedDate}${firstTenLetters}`;
    setGeneratedFileID(newGeneratedFileID);
    const newStudyId = generateUniqueId(); // Generate a new unique ID
    setStudyId(newStudyId); // Set the new unique ID to the state

    console.log('OUR INPUT VALUE:', inputValue);
    const payload = {
      filename: `${newStudyId}.npy`,
      prompt: inputValue || null,
      description: inputValue || null,
      studyID: newStudyId, // Use the new unique ID
      studyInstanceUID: newStudyId, // Use the new unique ID
      patient_name: `Generated Patient ${newStudyId}`,
      seriesInstanceUID: newStudyId + '.0',
      patient_id: newStudyId,
      read_img_flag: false,
      num_series_in_study: 0,
    };

    const headers = {
      'Content-Type': 'application/json',
    };

    const url = `${serverUrl}/files/${newStudyId}`;

    console.log('🔵 Sending POST request to:', url);
    console.log('🟢 Payload:', payload);

    try {
      const response = await axios.post(url, payload, { headers });
      console.log('✅ Response:', response.data);
      setGeneratingFilePrompt(response.data.prompt);
      setGeneratingFileSeriesInstanceUID(response.data.seriesInstanceUID);
    } catch (error) {
      setLogs(prevLogs => [...prevLogs, `Error generating CT scan: ${error.message}`]);
    } finally {
      setIsLoading(false);
      setIsGenerating(false); // Reset the generating state
    }
  };

  const waitForStudyID = async () => {
    let retries = 20; // Maximum retries
    while (!studyID && retries > 0) {
      console.log('⏳ Waiting for `studyID` to be set...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
      retries--;
    }

    if (!studyID) {
      console.error('❌ Timed out waiting for `studyID` to be set.');
      return;
    }

    console.log('✅ Study ID available:', studyID);

    // 🛠 NEW: Wait for Orthanc to confirm study exists before navigating
    const studyExists = await checkOrthancForStudy(studyID);
    if (studyExists) {
      console.log(`✅ Study ${studyID} found in Orthanc! Navigating...`);
      navigate(`/generative-ai?StudyInstanceUIDs=${studyID}`);
    } else {
      console.error('❌ Study still not available in Orthanc. Navigation aborted.');
    }
  };

  // Function to check if a study exists in Orthanc using `_getOrthancStudyByID`
  const checkOrthancForStudy = async studyInstanceUID => {
    let retries = 20; // Max retries to check if Orthanc has indexed the study
    while (retries > 0) {
      console.log(`🔍 Checking if study ${studyInstanceUID} exists in Orthanc...`);

      const study = await _getOrthancStudyByID(studyInstanceUID);

      if (study) {
        console.log('✅ Study found in Orthanc:', study);
        return true;
      }

      console.warn('⏳ Study not found yet, retrying...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retrying
      retries--;
    }

    console.error(`🚨 Study ${studyInstanceUID} not found after multiple attempts.`);
    return false;
  };

  const _getOrthancStudyByID = async studyInstanceUID => {
    try {
      // Parameters to include in the request
      const params = new URLSearchParams({ expand: 1, requestedTags: 'StudyInstanceUID' });
      const response = await fetch(orthancServerUrl + `/pacs/studies?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      // Filter the data to find the study with the given StudyInstanceUID
      const study = data.find(item => item.RequestedTags.StudyInstanceUID === studyInstanceUID);

      if (study) {
        console.log('We found study: ', study);
        return study;
      } else {
        console.error('No study found with studyInstanceUID: ', studyInstanceUID);
        return null;
      }
    } catch (error) {
      console.error('There has been a problem with _getOrthancStudyByID:', error);
      return null;
    }
  };

  // Function to download and upload images only after model is done generating
  const executeDownloadAndUpload = async generatedfileID => {
    try {
      console.log('Download and upload started for fileID: ', generatedfileID);
      const files = await _getFilesFromFolder(generatedfileID, 0);

      setDataIsUploading(true);

      const uploadPromises = files.map(async filename => {
        try {
          const blob = await _fetchDicomFile(generatedfileID, filename, 0);
          if (blob) {
            await _uploadDicomToOrthanc(blob);
          }
        } catch (innerError) {
          console.error('Error processing file:', filename, innerError);
          throw innerError;
        }
      });

      await Promise.all(uploadPromises); // Wait for all uploads to complete
      setDataIsUploading(false); // After all uploads are finished, set the uploading status to false
      console.log('All files uploaded successfully!');
      setLogs(prevLogs => [...prevLogs, 'All files uploaded successfully']);

      // const metadataPromise = await addDummyMetadata(studyID);
      setLogs(prevLogs => [...prevLogs, 'Navigating you to your generation.']);
      // Ensure studyID is correctly set before navigating
      const response = await addMetadataToStudy(studyID, '', 'Findings');
      console.log('Findings metadata response,', response);
      const response_impressions = await addMetadataToStudy(studyID, '', 'Impressions');
      console.log('Impressions metadata response,', response_impressions);
    } catch (error) {
      console.error('Error in downloading and uploading images:', error);
      setLogs(prevLogs => [...prevLogs, 'ERROR IN NAVIGATION.']);
      setDataIsUploading(false); // Ensure uploading status is updated in case of an error
      throw error;
    } finally {
      console.log('OUR STUDY ID TO NAVIGATE TO IS', studyID);
      waitForStudyID();
    }
  };

  const _getFilesFromFolder = async (foldername, sampleNumber) => {
    setLogs(prevLogs => [...prevLogs, `Fetching files from folder: ${foldername}`]);
    try {
      const response = await axios.get(`${serverUrl}/files/${foldername}/${sampleNumber}`);
      console.log('GET FILES RESPONSE:', response.data);
      return response.data; // Assuming the response contains a list of file names
    } catch (error) {
      console.error('Error fetching files:', error);
      setLogs(prevLogs => [...prevLogs, `Could not fetch files from folder: ${foldername}`]);
      throw error;
    }
  };

  const _fetchDicomFile = async (foldername, filename, sampleNumber) => {
    try {
      const response = await axios.post(
        `${serverUrl}/files/${foldername}/${filename}/${sampleNumber}`,
        { data: 'example' },
        { responseType: 'arraybuffer' }
      );

      const arrayBuffer = response.data;
      const blob = new Blob([arrayBuffer], { type: 'application/dicom' });
      return blob;
    } catch (error) {
      console.error('Error fetching DICOM file:', error);
      return null;
    }
  };

  const _uploadDicomToOrthanc = async blob => {
    try {
      const formData = new FormData();
      formData.append('file', blob, 'example.dcm');

      const uploadResponse = await axios.post(orthancServerUrl + '/pacs/instances', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('uploaded successfully', uploadResponse.data);

      const instanceId = uploadResponse.data['ID'];
      if (!instanceId) {
        console.log('Error uploading DICOM file to Orthanc:', uploadResponse.data);
        return;
      }

      const instanceReponse = await axios.get(`${orthancServerUrl}/pacs/instances/${instanceId}`);
      const studyInstanceUid = instanceReponse.data['ParentStudy'];

      console.log(`our study instance UID is: `, studyInstanceUid);

      if (studyInstanceUid) {
        // Step 4: Trigger metadata reconstruction for the study
        await axios.post(`${orthancServerUrl}/pacs/studies/${studyInstanceUid}/reconstruct`);
        console.log(`🔄 Reconstructing metadata for study: ${studyInstanceUid}`);
      } else {
        console.error('Error fetching study instance UID:', instanceReponse.data);
      }
    } catch (error) {
      console.error('Error uploading DICOM file to Orthanc:', error);
    }
  };

  const _getOrthancStudyId = async (studyInstanceUid, sampleNumber) => {
    try {
      const response = await axios.get(
        `${orthancServerUrl}/pacs/studies?StudyInstanceUID=${studyInstanceUid}/${sampleNumber}`
      );
      if (response.data && response.data.length > 0) {
        return response.data[0].ID; // Assuming the response contains a list with the study ID
      } else {
        console.log('Study not found.');
        return null;
      }
    } catch (error) {
      console.log(`Error fetching study ID: ${error}`);
      return null;
    }
  };

  const _addMetadataToStudy = async (studyInstanceUid, data, type) => {
    // Validate the metadata type
    if (type !== 'Findings' && type !== 'Impressions') {
      console.log(`Invalid metadata type: ${type}. Must be either 'Findings' or 'Impressions'.`);
      return;
    }

    try {
      // Step 1: Get the Study ID
      const studyId = await _getOrthancStudyId(studyInstanceUid, 0);
      if (!studyId) {
        console.log(`Study with UID ${studyInstanceUid} not found.`);
        return;
      }

      // Step 2: Prepare the metadata URL
      const url = `${orthancServerUrl}/pacs/studies/${studyId}/metadata/${type}`;

      // Step 3: Set headers
      const headers = {
        'Content-Type': 'text/plain', // Ensure text content type
      };

      // Step 4: Send the PUT request with the data
      const response = await axios.put(url, data, { headers });

      // Step 5: Check if the request was successful
      if (response.status !== 200) {
        console.log(
          `Failed to add metadata. Status: ${response.status}, Response: ${response.statusText}`
        );
      } else {
        console.log(`Successfully added metadata for ${type}.`);
        return response.data;
      }
    } catch (error) {
      console.log(`Error in adding metadata: ${error}`);
    }
  };

  const generateUniqueTimestamp = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  };

  const generateUniqueId = () => {
    // return Math.random().toString(11).substr(2, 9);
    //generate a random string with 15 numbers - no letters
    return Math.floor(Math.random() * 1000000000000000).toString();
  };

  const styles = {
    searchHomepage: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background:
        'linear-gradient(190deg, rgb(220, 220, 220), rgb(240, 240, 240), rgb(210, 210, 210))',
      animation: 'gradient 15s ease infinite',
    },
    title: {
      fontSize: '4rem',
      color: 'indigo',
      marginBottom: '20px',
      fontWeight: 'bold',
      textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
    },
    subtitle: {
      fontSize: '1.5rem',
      color: 'indigo',
      marginBottom: '20px',
      fontWeight: '300',
      fontStyle: 'italic',
    },
    searchBar: {
      width: '50%',
      padding: '15px',
      border: 'none',
      borderRadius: '25px',
      fontSize: '1.2rem',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      outline: 'none',
      marginBottom: '20px',
    },
    searchButton: {
      padding: '10px 20px',
      fontSize: '1.2rem',
      border: 'none',
      borderRadius: '25px',
      backgroundColor: 'indigo',
      color: 'white',
      cursor: 'pointer',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    },
    modelStatus: {
      display: 'flex',
      alignItems: 'center',
      marginTop: '10px',
    },
    statusDot: {
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      marginRight: '10px',
      backgroundColor: isServerRunning ? 'green' : 'red',
    },
    logs: {
      marginTop: '20px',
      color: 'indigo',
      fontSize: '1rem',
      textAlign: 'left' as const,
      width: '40%', // Adjusted size
      maxHeight: '15vh', // Adjusted height
      overflowY: 'auto' as const,
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      padding: '10px',
      borderRadius: '10px',
    },
    logo: {
      width: '20vw', // Adjust the width as needed
      marginBottom: '20px',
    },
    '@keyframes gradient': {
      '0%': {
        background:
          'linear-gradient(190deg, rgb(220, 220, 220), rgb(240, 240, 240), rgb(210, 210, 210))',
      },
      '50%': {
        background:
          'linear-gradient(190deg, rgb(220, 220, 220), rgb(240, 240, 240), rgb(210, 210, 210))',
      },
      '100%': {
        background:
          'linear-gradient(190deg, rgb(220, 220, 220), rgb(240, 240, 240), rgb(210, 210, 210))',
      },
    },
    cornerContainer: {
      position: 'absolute' as const,
      top: '10px',
      right: '10px',
      display: 'flex',
      alignItems: 'right',
    },
    cornerIcon: {
      width: '30px',
      height: '30px',
      marginTop: '10px',
      marginRight: '25px',
    },
  };

  return (
    <div style={styles.searchHomepage}>
      <div style={styles.cornerContainer}>
        <img
          style={styles.cornerIcon}
          src="../../assets/stack-icon.png"
          alt="stack icon"
          onClick={() => {
            if (auth.currentUser) {
              console.log("logged in");
            }
            else {console.log("logged out");}
            navigate('/');}}
        ></img>
        <img
          style={styles.cornerIcon}
          src="../../assets/message-icon.png"
          alt="profile icon"
          onClick={() => navigate('/')}
        ></img>
        <img
          style={styles.cornerIcon}
          src="../../assets/profile-icon.png"
          alt="stack icon"
          onClick={() => navigate('/login')}
        ></img>
      </div>
      <img
        src={'/assets/logo.png'} // Ensure the path is correct relative to the public directory
        alt="Logo"
        style={styles.logo}
      />
      <h1 style={styles.title}>IndaigoMed</h1>
      <h3 style={styles.subtitle}>
        bringing AI-powered medical image search and generation to your finger tips
      </h3>
      <input
        type="text"
        style={styles.searchBar}
        placeholder="What do you want to generate...?"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)} // Add this line
      />
      <button
        style={styles.searchButton}
        onClick={handleGenerateClick}
        disabled={isModelRunning || dataIsUploading}
      >
        {isGenerating ? 'Stop Generation' : isLoading ? 'Generating...' : 'Generate'}
      </button>
      <div style={styles.modelStatus}>
        <div style={styles.statusDot}></div>
        <span>{isServerRunning ? 'Server is running' : 'Server is off'}</span>
      </div>
      {isGenerating && (
        <div style={{ width: '50%', marginTop: '20px' }}>
          <div style={{ width: `${progress}%`, height: '20px', backgroundColor: 'indigo' }}></div>
        </div>
      )}
      {logs.length > 0 && (
        <div style={styles.logs}>
          {/* Only show the latest log */}
          <div>{logs[logs.length - 1]}</div>
        </div>
      )}
    </div>
  );
};

export default SearchHomePage;
