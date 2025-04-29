// import {classes} from '@ohif/core';
// import studyMetadata from '../../../backend/init_metadata.json';
// const { MetadataProvider } = classes;


// //TODO: add Interface for MetadataHere
// // slice: important only for scrollbar
// // imageId: "wadors:/dicom-web/studies/[StudyInstanceUID]/series/[SeriesInstanceUID]/instances/[SOPInstanceUID]/frames/1",
// const metaData = [
//   {
//     "imageId": "wadors:/dicom-web/studies/1/series/1/instances/1.2.3.2/frames/1",
//     "slice": 23,
//     "elements": [
//       {
//         "id": "1",
//         "type": "Rectangle",
//         "attributes": {
//           "x": 200,
//           "y": 200,
//           "width": 75,
//           "height": 75,
//           "color": [120, 0, 0, 0.5]
//         }
//       }
//     ]
//   },
//   {
//     "imageId": "wadors:/dicom-web/studies/1/series/1/instances/1.2.3.33/frames/1",
//     "slice": 24,
//     "elements": [
//       {
//         "id": "2",
//         "attributes": {
//           "x": 200,
//           "y": 200,
//           "width": 100,
//           "height": 100,
//           "color": [120, 0, 0, 0.5]
//         }
//       }
//     ]
//   },
//   {
//     "imageId": "wadors:/dicom-web/studies/1/series/1/instances/1.2.3.3/frames/1",
//     "slice": 25,
//     "elements": [
//       {
//         "id": "3",
//         "attributes": {
//           "x": 200,
//           "y": 200,
//           "width": 75,
//           "height": 75,
//           "color": [120, 0, 0, 0.5]
//         }
//       },
//       {
//         "id": "4",
//         "attributes": {
//           "x": 256,
//           "y": 256,
//           "width": 75,
//           "height": 75,
//           "color": [0, 0, 120, 0.5]
//         }
//       }
//     ]
//   },
//   {
//     "imageId": "wadors:/dicom-web/studies/1/series/2/instances/1.2.3.2/frames/1",
//     "slice": 23,
//     "elements": [
//       {
//         "id": "5",
//         "type": "Rectangle",
//         "attributes": {
//           "x": 200,
//           "y": 200,
//           "width": 75,
//           "height": 75,
//           "color": [120, 0, 0, 0.5]
//         }
//       }
//     ]
//   },
//   {
//     "imageId": "wadors:/dicom-web/studies/1/series/2/instances/1.2.3.4/frames/1",
//     "slice": 0,
//     "elements": [
//       {
//         "id": "6",
//         "type": "Rectangle",
//         "attributes": {
//           "x": 200,
//           "y": 200,
//           "width": 200,
//           "height": 200,
//           "color": [120, 0, 0, 0.5]
//         }
//       }
//     ]
//   },
//   {
//     "imageId": "wadors:/dicom-web/studies/1/series/2/instances/1.2.3.17/frames/1",
//     "slice": 49,
//     "elements": [
//       {
//         "id": "6",
//         "type": "Rectangle",
//         "attributes": {
//           "x": 200,
//           "y": 200,
//           "width": 200,
//           "height": 200,
//           "color": [120, 0, 0, 0.5]
//         }
//       }
//     ]
//   },/**
//   {
//     "imageId": "wadors:/dicom-web/studies/3.2/series/3.2.2/instances/1.2.826.0.1.3680043.8.498.52446303580485985714866618176921288824/frames/1",
//     "slice": 140,
//     "elements": [
//       {
//         "id": "7",
//         "type": "Rectangle",
//         "attributes": {
//           "x": 92,
//           "y": 203,
//           "width": 50,
//           "height": 25,
//           "color": [255, 51, 102, 1],

//         }
//       }
//     ]
//   },
//   {
//     "imageId": "wadors:/dicom-web/studies/3.2/series/3.2.2/instances/1.2.826.0.1.3680043.8.498.12544928690284129766048880761169655126/frames/1",
//     "slice": 139,
//     "elements": [
//       {
//         "id": "7",
//         "type": "Rectangle",
//         "attributes": {
//           "x": 92,
//           "y": 203,
//           "width": 50,
//           "height": 25,
//           "color": [255, 51, 102, 1],

//         }
//       }
//     ]
//   },
//    */
// ]

// function addStudyMetadata(){
//   // Iterate studyMetadata and store it in MetadataProvider
//   for (const [key, value] of Object.entries(studyMetadata)) {
//     MetadataProvider.addCustomMetadata(key, 'studyMetadata', value);
//   }

// }

// // group metaData by start of imageId (this corresponsds to same displayed image stack)
// function groupMetaData() {
//   const groupedData = {};
//   for (let i = 0; i < metaData.length; i++) {
//     const imageId = metaData[i].imageId;
//     const groupId = imageId.split('/instances/')[0];
//     if (!groupedData[groupId]) {
//       groupedData[groupId] = [];
//     }
//     groupedData[groupId].push(metaData[i]);
//   }
//   return groupedData;
// }





// // store all rectangles per image stack
// function addSlices(){
//   const groupedMetaData = groupMetaData();

//   for (let key in groupedMetaData) {
//     if (groupedMetaData.hasOwnProperty(key)) {
//       MetadataProvider.addCustomMetadata(key, 'ScrollbarElements',groupedMetaData[key]);
//     }
//   }
// };

// function addRectangles(){
//   for (let i = 0; i < metaData.length; i++) {
//     MetadataProvider.addCustomMetadata(metaData[i].imageId, 'Overlay', metaData[i].elements); // 'Overlay' is just a random name that have to be matched when geting the data with metaData.get

//   };
// };
// // store all elements of metaData into MetadataProvider, sth. it can be consumed by other parts of the application
// function initMetaData() {
//   addRectangles();
//   addSlices();
//   addStudyMetadata();
// };
// export default initMetaData;
