import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import UserFeedback from './UserFeedback';
import { getRenderingEngine, metaData, StackViewport } from '@cornerstonejs/core';

// example of setting the SeriesPrompt via the terminal:
// curl -X PUT "http://localhost:8042/series/b5da4164-106f1d99-2c273087-9c764fd8-ae12f84d/metadata/SeriesPrompt" \
// -d 'left rib fractures left bloody pleural effusion adjacent peripheral lung contusion small left pneumothorax' \
// -H "Content-Type: application/json"

const orthancServerUrl =
  window.location.hostname === 'localhost'
    ? 'http://localhost'
    : 'https://orthanc.katelyncmorrison.com';

const StudyMetadataDisplay = ({
  description,
  onClick,
  onDoubleClick,
  seriesInstanceUID,
  modality
}) => {
  const [promptMetaData, setPromptMetaData] = useState("");
  const [seriesID, setSeriesID] = useState("");

  useEffect(() => {
    if (modality === 'AI') {
      const fetchMetadata = async () => {
        console.log("we are checking for: ", seriesInstanceUID);
        const orthancSeriesID = await _getOrthancSeriesByID(seriesInstanceUID);
        console.log("WHAT WE GOT IN RETURN: ", orthancSeriesID);

        const seriesUid = orthancSeriesID?.ID;

        console.log("Now we're checking for seriesID: ", seriesUid);

        if (seriesUid) {
          const response = await _getPromptMetadataOfSeries(seriesUid);
          console.log("what was our prompt response: ", response)
          setPromptMetaData(response || "No metadata found.");
        }
      };

      fetchMetadata();
    }
  }, [seriesInstanceUID, modality]);



  if (modality !== 'AI') return (
    <div className="group mb-8 flex flex-1 cursor-pointer flex-col px-3 outline-none"
      onClick={onClick}
      onDoubleClick={onDoubleClick}>
      <span className="text-primary-main font-bold select-none mb-1">{description}</span>


    </div>
  );

  return (
    <div className="group mb-8 flex flex-1 cursor-pointer flex-col px-3 outline-none"
      onClick={onClick}
      onDoubleClick={onDoubleClick}>
      <span className="text-primary-main font-bold select-none mb-1">{description}</span>
      <div className="break-all text-base text-blue-300 mt-1">Prompt: </div>
      <div className="break-words text-base text-white">
        {promptMetaData ? promptMetaData : ''}
      </div>
      {/* <UserFeedback seriesID={seriesID} /> */}
    </div>
  );
};

StudyMetadataDisplay.propTypes = {
  impressions: PropTypes.string,
};


const _getPromptMetadataOfSeries = async (seriesID) => {

  try {
    const url = `${orthancServerUrl}/pacs/series/${seriesID}/metadata/SeriesPrompt`;
    console.log("📡 Fetching metadata from:", url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'text/plain',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`❌ Metadata fetch failed. Status: ${response.status}. Response: ${errorText}`);
      return null;
    }

    const metadataText = await response.text();
    console.log("✅ Retrieved SeriesPrompt metadata:", metadataText);
    return metadataText;
  } catch (error) {
    console.error("❌ Error fetching SeriesPrompt metadata:", error);
    return null;
  }
};

const _getOrthancSeriesByID = async seriesInstanceUID => {
  try {
    // Parameters to include in the request
    const params = new URLSearchParams({
      expand: 1,
      requestedTags: 'SeriesInstanceUID',
    });

    const response = await fetch(orthancServerUrl + `/pacs/series?${params.toString()}`);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();

    // Filter the data to find the study with the given seriesInstanceUID
    const study = data.find(item => item.RequestedTags.SeriesInstanceUID === seriesInstanceUID);

    if (study) {
      return study;
    } else {
      console.error('No series found with no seriesInstanceUID: ', seriesInstanceUID);
      return null;
    }
  } catch (error) {
    // Log any errors that occur during the fetch operation
    console.error('There has been a problem with your fetch operation:', error);
    return null;
  }
};

export default StudyMetadataDisplay;
