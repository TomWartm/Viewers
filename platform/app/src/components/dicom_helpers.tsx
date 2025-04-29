import axios from 'axios';
// Remove the import of fs and path as they are not compatible with the browser

const orthancUrl = 'https://orthanc.katelyncmorrison.com/pacs';

export const deleteSeries = async (seriesToDelete: string) => {
  const seriesUrl = `${orthancUrl}/series/`;
  const params = {
    expand: 1,
    requestedTags: 'SeriesInstanceUID',
  };

  try {
    const seriesResponse = await axios.get(seriesUrl, { params });
    const seriesId = seriesResponse.data
      .filter((entry: any) => entry.RequestedTags.SeriesInstanceUID === seriesToDelete)
      .map((entry: any) => entry.ID);

    for (const serieId of seriesId) {
      const serieResponse = await axios.delete(`${orthancUrl}/series/${serieId}`);
      if (serieResponse.status !== 200) {
        console.error(`Failed to delete series. Status code: ${serieResponse.status}`);
        console.error(`Response: ${serieResponse.data}`);
        return;
      }
      console.log(`Deleted Series: ${serieId}`);
    }
  } catch (error) {
    console.error('Error deleting series:', error);
  }
};

export const uploadDicomFolder = async (dicomFolder: string) => {
  console.log('Uploading DICOM folder to Orthanc...');
  const orthancUrl = 'https://orthanc.katelyncmorrison.com/pacs/instances';
  const chunkSize = 5 * 1024 * 1024; // 5MB

  try {
    const response = await axios.get(`${serverUrl}/files/${dicomFolder}`);
    const files = response.data;

    for (const file of files) {
      if (file.endsWith('.dcm')) {
        const dicomFilePath = `${serverUrl}/files/${dicomFolder}/${file}`;
        const fileResponse = await axios.get(dicomFilePath, { responseType: 'arraybuffer' });
        const fileBuffer = fileResponse.data;

        for (let i = 0; i < fileBuffer.byteLength; i += chunkSize) {
          const chunk = fileBuffer.slice(i, i + chunkSize);
          const response = await axios.post(orthancUrl, chunk, {
            headers: { 'Content-Type': 'application/dicom' },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
          });

          if (response.status !== 200) {
            console.error(`Failed to upload a chunk of ${file}. Status code: ${response.status}`);
            console.error(`Response: ${response.data}`);
            break;
          }
        }
      }
    }
  } catch (error) {
    console.error('Error uploading DICOM folder:', error);
  }
};

export const storeMetadata = async (
  seriesInstanceUid: string,
  metadata: any,
  jsonFilePath: string
) => {
  const data = JSON.parse(localStorage.getItem(jsonFilePath) || '{}');

  if (!data[seriesInstanceUid]) {
    data[seriesInstanceUid] = {};
  }

  for (const [key, value] of Object.entries(metadata)) {
    data[seriesInstanceUid][key] = value;
  }

  localStorage.setItem(jsonFilePath, JSON.stringify(data, null, 4));
  console.log(`Entry with study_instance_uid ${seriesInstanceUid} added or updated.`);
};

const getOrthancStudyId = async (studyInstanceUid: string) => {
  const params = {
    expand: 1,
    requestedTags: 'StudyInstanceUID',
  };

  try {
    const response = await axios.get(`${orthancUrl}/studies`, { params });
    if (response.status !== 200) {
      console.error(`Network response was not ok. Status: ${response.status}`);
      return null;
    }

    const study = response.data.find(
      (item: any) => item.RequestedTags.StudyInstanceUID === studyInstanceUid
    );
    return study ? study.ID : null;
  } catch (error) {
    console.error('Error fetching study ID:', error);
    return null;
  }
};

export const addMetadataToStudy = async (studyInstanceUid: string, data: string, type: string) => {
  if (type !== 'Impressions' && type !== 'Findings' && type !== 'StudyDescription') {
    console.error(
      `Invalid metadata type: ${type}. Must be either 'Impressions', 'Findings', or 'StudyDescription'.`
    );
    return;
  }

  const studyId = await getOrthancStudyId(studyInstanceUid);
  if (!studyId) {
    return;
  }

  try {
    const url = `${orthancUrl}/studies/${studyId}/metadata/${type}`;
    const headers = {
      'Content-Type': 'text/plain',
    };

    const response = await axios.put(url, data, { headers });
    if (response.status !== 200) {
      console.error(`Response not ok. Status: ${response.status}, Response text: ${response.data}`);
    }
  } catch (error) {
    console.error('Error adding metadata to study:', error);
  }
};

const getOrthancSeriesId = async (seriesInstanceUid: string) => {
  const params = {
    expand: 1,
    requestedTags: 'SeriesInstanceUID',
  };

  try {
    const response = await axios.get(`${orthancUrl}/series`, { params });
    if (response.status !== 200) {
      console.error(`Network response was not ok. Status: ${response.status}`);
      return null;
    }

    const series = response.data.find(
      (item: any) => item.RequestedTags.SeriesInstanceUID === seriesInstanceUid
    );
    return series ? series.ID : null;
  } catch (error) {
    console.error('Error fetching series ID:', error);
    return null;
  }
};

export const addMetadataToSeries = async (
  seriesInstanceUid: string,
  data: string,
  type: string
) => {
  if (type !== 'SeriesPrompt') {
    console.error(`Invalid metadata type: ${type}.`);
    return;
  }

  const seriesId = await getOrthancSeriesId(seriesInstanceUid);
  if (!seriesId) {
    return;
  }

  try {
    const url = `${orthancUrl}/series/${seriesId}/metadata/${type}`;
    const headers = {
      'Content-Type': 'text/plain',
    };

    const response = await axios.put(url, data, { headers });
    if (response.status !== 200) {
      console.error(`Response not ok. Status: ${response.status}, Response text: ${response.data}`);
    }
  } catch (error) {
    console.error('Error adding metadata to series:', error);
  }
};
