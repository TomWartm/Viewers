import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import UserFeedbackRow from './UserFeedbackRow';
import debounce from 'lodash.debounce';

const orthancServerUrl =
  window.location.hostname === 'localhost'
    ? 'http://localhost'
    : 'https://orthanc.katelyncmorrison.com';

const UserFeedback = ({ seriesID }) => {
  const [feedback, setFeedback] = useState({
    'Anatomically realistic?': { thumbsUp: false, thumbsDown: false },
    'Abnormalities of prompt can be seen in image?': { thumbsUp: false, thumbsDown: false },
    'Location of abnormalities align with prompt?': { thumbsUp: false, thumbsDown: false },
    'Magnitude of abnormalities align with prompt?': { thumbsUp: false, thumbsDown: false },
  });

  useEffect(() => {
    const fetchInitialFeedback = async () => {
      const data = await getMetadataOfSeries(seriesID, 'Feedback');
      console.log(data);
      if (data) {
        setFeedback(JSON.parse(data));
      }
    };

    fetchInitialFeedback();
  }, [seriesID]);

  const handleThumbsUp = async (question) => {
    setFeedback((prevFeedback) => {
      const updatedFeedback = {
        ...prevFeedback,
        [question]: {
          thumbsUp: !prevFeedback[question].thumbsUp,
          thumbsDown: prevFeedback[question].thumbsDown,
        },
      };


      const data = JSON.stringify(updatedFeedback);
      debouncedAddMetadataToSeries(seriesID, data, 'Feedback');

      return updatedFeedback;
    });
  };

  const handleThumbsDown = (question) => {
    setFeedback((prevFeedback) => {
      const updatedFeedback = {
        ...prevFeedback,
        [question]: {
          thumbsUp: prevFeedback[question].thumbsUp,
          thumbsDown: !prevFeedback[question].thumbsDown,
        },
      };

      const data = JSON.stringify(updatedFeedback);
      debouncedAddMetadataToSeries(seriesID, data, 'Feedback');

      return updatedFeedback;
    });
  };


  const addMetadataToSeries = async (seriesID, data, type) => {
    if (type !== 'Feedback') {
      console.error('Invalid metadata type');
      return;
    }
    try {
      const url = `${orthancServerUrl}/pacs/series/${seriesID}/metadata/${type}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: data
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log("Response not ok. Status:", response.status, "Response text:", errorText);
        return;
      }

    } catch (error) {
      console.error('There was a problem with your fetch operation:', error);
    }
  };

  const debouncedAddMetadataToSeries = useCallback(
    debounce((orthancSeriesID, value, type) => {
      addMetadataToSeries(orthancSeriesID, value, type);
    }, 500),
    []
  );

  const getMetadataOfSeries = async (seriesID, type) => {
    if (type !== 'Feedback') {
      console.error('Invalid metadata type');
      return;
    }
    try {
      const url = `${orthancServerUrl}/pacs/series/${seriesID}/metadata/${type}`;
      console.log("url", url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'text/plain'  // Ensure the server expects text/plain content type
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log("Response not ok. Status:", response.status, "Response text:", errorText);
        return;
      }
      else {
        return response.text();
      }

    } catch (error) {
      console.error('There was a problem with your fetch operation:', error);
    }
  }

  return (
    <div>
      <table className="text-gray-500 text-base w-full mt-2">

        <tbody >
          {Object.keys(feedback).map((question) => (
            <UserFeedbackRow
              key={question}
              question={question}
              thumbsUp={feedback[question].thumbsUp}
              thumbsDown={feedback[question].thumbsDown}
              onThumbsUp={() => handleThumbsUp(question)}
              onThumbsDown={() => handleThumbsDown(question)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

UserFeedback.propTypes = {
  seriesID: PropTypes.string.isRequired,
};

export default UserFeedback;
