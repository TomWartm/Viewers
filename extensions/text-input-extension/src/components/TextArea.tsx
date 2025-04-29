import React, { useState, useEffect, useCallback } from 'react';
import { ActionButtons, Button, ButtonEnums, InputText, Input, Icon, useViewportGrid } from '@ohif/ui'
import { useNavigate } from 'react-router-dom'
import { DicomMetadataStore, DisplaySetService } from '@ohif/core'
import { Enums, annotation as CornerstoneAnnotation, annotations as CornerstoneAnnotations } from '@cornerstonejs/tools';
import { RectangleROITool, segmentation } from '@cornerstonejs/tools';
import {
    getEnabledElement,
    StackViewport,
    VolumeViewport,
    utilities as csUtils,
    Types as CoreTypes,
    BaseVolumeViewport,
    metaData,
} from '@cornerstonejs/core';
import getActiveViewportEnabledElement from '../../../cornerstone/src/utils/getActiveViewportEnabledElement';
import * as cornerstoneTools from '@cornerstonejs/tools';
import * as cornerstone from '@cornerstonejs/core';
import RectangleOverlayViewerTool from '../tools/RectangleOverlayViewerTool';
import debounce from 'lodash.debounce';

const orthancServerUrl =
  window.location.hostname === 'localhost'
    ? 'http://localhost'
    : 'https://orthanc.katelyncmorrison.com';
//import Icon from '../../../../platform/ui/src/components/Icon'

/**
 * This Component allows Text input and provides features to send text to backend§ services
 * Its state is not shared with other components.
 *
 */


function TextArea({ servicesManager, commandsManager }) {
    const { measurementService, displaySetService, toolGroupService, segmentationService, viewportGridService, hangingProtocolService } = servicesManager.services;
    const [reportImpressionsData, setReportImpressionsData] = useState('');
    const [reportFindingsData, setReportFindingsData] = useState('');
    const [textData, setTextData] = useState('');

    const disabled = false;

    const [{ viewports }] = useViewportGrid();

    const [orthancStudyID, setOrthancStudyID] = useState('');


    const handleDisplaySetsChanged = async (changedDisplaySets) => {
        // set initial report data
        // get studyUIDs of current display
        const activeDisplaySets = displaySetService.getActiveDisplaySets();

        const studyInstanceUIDs = activeDisplaySets.map(set => set.StudyInstanceUID); //e.g. ["2.6"], it guaranteed that there is only one studyInstanceUID

        // set orthancStudyID
        const orthancStudyID = await _getOrthancStudyID(studyInstanceUIDs[0]);

        setOrthancStudyID(orthancStudyID);

        // findings
        let initialReportFindingsText;
        if (orthancStudyID !== null) {
            initialReportFindingsText = await getMetadataOfStudy(orthancStudyID, 'Findings');
        }

        setReportFindingsData(initialReportFindingsText);

        // impressions
        let initialReportImpressionsText;
        if (orthancStudyID !== null) {
            initialReportImpressionsText = await getMetadataOfStudy(orthancStudyID, 'Impressions');
        }


        setReportImpressionsData(initialReportImpressionsText);

    };

    useEffect(() => {
        // run when component is mounted at least once to avoid empty text when closing and reopening tab
        handleDisplaySetsChanged();
        // Subscribe to the DISPLAY_SETS_CHANGED event
        const displaySetSubscription = displaySetService.subscribe(
            displaySetService.EVENTS.DISPLAY_SETS_CHANGED,
            handleDisplaySetsChanged
        );

        // Unsubscribe from the event when the component unmounts
        return () => {
            displaySetSubscription.unsubscribe(displaySetSubscription);
        };
    }, []);


    // change prompt data if certain AI generated image is selected
    useEffect(() => {
        const handleGridStateChanged = changedDisplaySets => {
            // ugly hack since viewport grid updatedes later than GRID_STATE_CHANGED event
            setTimeout(() => {

                const viewportState = viewportGridService.getState();

                const activeViewportId = viewportGridService.getActiveViewportId();

                const activeViewport = viewportState.viewports.get(activeViewportId);

                const activeDisplaySetInstanceUID = activeViewport.displaySetInstanceUIDs[0];
                const activeDisplaySets = displaySetService.getActiveDisplaySets();
                const activeDisplaySet = activeDisplaySets.find(displaySet => displaySet.displaySetInstanceUID === activeDisplaySetInstanceUID);
                const activeSeriesInstanceUID = activeDisplaySet.SeriesInstanceUID;
                const activeSeriesStudyMetadata = metaData.get('studyMetadata', activeSeriesInstanceUID);
                //setPromptData(activeSeriesStudyMetadata?.impressions || ''); // set it to empty string if undefined

            }, 50)


        };

        // Subscribe to the GRID_STATE_CHANGED event
        const activeViewportSubscription = viewportGridService.subscribe(
            viewportGridService.EVENTS.GRID_STATE_CHANGED,
            handleGridStateChanged
        );

        // Unsubscribe from the event when the component unmounts
        return () => {
            activeViewportSubscription.unsubscribe(activeViewportSubscription);
        };
    }, []);
    useEffect(() => {
        const activeDisplaySets = displaySetService.getActiveDisplaySets();

    }, []);



    const setPromptDataToReportImpressionsData = (event) => {

        setPromptData(reportImpressionsData);
    }
    const setReportImpressionsDataToPromptData = (event) => {
        setReportImpressionsData(promptData);
    }

    const saveReport = (event) => {
        console.log(event.target.value);
    }

    const handleReportFindingsChange = (event) => {
        debouncedAddMetadataToStudy(orthancStudyID, event.target.value, 'Findings');
        setReportFindingsData(event.target.value);
    };
    const handleReportImpressionsChange = async (event) => {

        debouncedAddMetadataToStudy(orthancStudyID, event.target.value, 'Impressions');
        setReportImpressionsData(event.target.value);

    };



    const _getOrthancStudyID = async (studyInstanceUID) => {
        try {
            // Parameters to include in the request
            const params = new URLSearchParams({
                expand: 1,
                requestedTags: "StudyInstanceUID"
            });

            // Fetching DICOM studies from the PACS server with query parameters
            const response = await fetch(`${orthancServerUrl}/pacs/studies?${params.toString()}`);

            // Check if the response is ok (status code 200-299)
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            // Parse the response as JSON
            const data = await response.json();

            // Filter the data to find the study with the given StudyInstanceUID
            const study = data.find(item => item.RequestedTags.StudyInstanceUID === studyInstanceUID);

            // Check if the study was found
            if (study) {
                return study.ID;
            } else {
                return null;
            }
        } catch (error) {
            // Log any errors that occur during the fetch operation
            console.error('There has been a problem with your fetch operation:', error);
            return null;
        }
    };

    //type: 'Impressions' or 'Findings'
    const addMetadataToStudy = async (studyID, data, type) => {
        if (type !== 'Impressions' && type !== 'Findings') {
            console.error('Invalid metadata type');
            return;
        }
        try {
            const url = `${orthancServerUrl}/pacs/studies/${studyID}/metadata/${type}`;
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'text/plain'  // Ensure the server expects text/plain content type
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

    const debouncedAddMetadataToStudy = useCallback(
        debounce((orthancStudyID, value, type) => {
            addMetadataToStudy(orthancStudyID, value, type);
        }, 500),
        []
    );

    // returns metadata or null if no metadata
    // type: 'Impressions' or 'Findings'
    const getMetadataOfStudy = async (studyID, type) => {
        if (type !== 'Impressions' && type !== 'Findings') {
            console.error('Invalid metadata type');
            return;
        }
        try {
            const url = `${orthancServerUrl}/pacs/studies/${studyID}/metadata/${type}`;
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
        <div className="bg-black">
            <div className="flex flex-col justify-center p-4 bg-primary-dark">
                <div className="text-primary-main font-bold mb-2">Findings</div>
                <textarea
                    rows={10}
                    label="Enter findings:"
                    className="text-white text-[14px] leading-[1.2] border-primary-main bg-black align-top sshadow transition duration-300 appearance-none border border-inputfield-main focus:border-inputfield-focus focus:outline-none disabled:border-inputfield-disabled rounded w-full py-2 px-3 text-sm text-white placeholder-inputfield-placeholder leading-tight mb-4"
                    type="text"
                    value={reportFindingsData}
                    onChange={handleReportFindingsChange}
                >

                </textarea>
                <div className="text-primary-main font-bold mb-2">Impressions</div>
                <textarea
                    rows={10}
                    label="Enter impressions:"
                    className="text-white text-[14px] leading-[1.2] border-primary-main bg-black align-top sshadow transition duration-300 appearance-none border border-inputfield-main focus:border-inputfield-focus focus:outline-none disabled:border-inputfield-disabled rounded w-full py-2 px-3 text-sm text-white placeholder-inputfield-placeholder leading-tight"
                    type="text"
                    value={reportImpressionsData}
                    onChange={handleReportImpressionsChange}
                >

                </textarea>


                <div className="flex justify-center p-4 bg-primary-dark">
                    <ActionButtons
                        className="bg-primary-dark mr-4"
                        actions={[
                            {
                                label: 'Save',
                                onClick: saveReport,
                            }
                        ]}
                        disabled={disabled}
                    />
                    {/*
                    <Button
                        onClick={setPromptDataToReportImpressionsData}
                        type={ButtonEnums.type.secondary}
                        size={ButtonEnums.size.small}
                        className="ml-3"
                        >
                        <Icon
                            name="arrow-right"
                            className="transform rotate-90 h-5 w-5"
                        />
                    </Button>
                    */}
                </div>


            </div>


        </div>

    );


}

export default TextArea;
