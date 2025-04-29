import { hotkeys} from '@ohif/core';
import {metaData} from '@cornerstonejs/core';
import {addTool} from '@cornerstonejs/tools';
import initToolGroups from './initToolGroups';
import toolbarButtons from './toolbarButtons';
import segmentationButtons from './segmentationButtons';
// import initMetaData from './initMetaData';
import { id } from './id';

// import RectangleOverlayViewerTool from '../../../extensions/text-input-extension/src/tools/RectangleOverlayViewerTool';

const ohif = {
  layout: '@ohif/extension-default.layoutTemplateModule.viewerLayout',
  sopClassHandler: '@ohif/extension-default.sopClassHandlerModule.stack',
  leftPanel: '@ohif/extension-default.panelModule.seriesList',
  rightPanel: '@ohif/extension-default.panelModule.measure',
};

const cornerstone = {
  viewport: '@ohif/extension-cornerstone.viewportModule.cornerstone',
};
const segmentation = {
  panel: '@ohif/extension-cornerstone-dicom-seg.panelModule.panelSegmentation',
  panelTool: '@ohif/extension-cornerstone-dicom-seg.panelModule.panelSegmentationWithTools',
  sopClassHandler: '@ohif/extension-cornerstone-dicom-seg.sopClassHandlerModule.dicom-seg',
  viewport: '@ohif/extension-cornerstone-dicom-seg.viewportModule.dicom-seg',
};
/**
 * Just two dependencies to be able to render a viewport with panels in order
 * to make sure that the mode is working.
 */
const extensionDependencies = {
  '@ohif/extension-default': '^3.0.0',
  '@ohif/extension-cornerstone': '^3.0.0',
  '@ohif/extension-cornerstone-dicom-seg': '^3.0.0',
  'text-input-extension': '^1.0.0',
};

function modeFactory({ modeConfiguration }) {
  return {
    /**
     * Mode ID, which should be unique among modes used by the viewer. This ID
     * is used to identify the mode in the viewer's state.
     */
    id,
    routeName: 'generative-ai',
    /**
     * Mode name, which is displayed in the viewer's UI in the workList, for the
     * user to select the mode.
     */
    displayName: 'Generative AI Mode',
    /**
     * Runs when the Mode Route is mounted to the DOM. Usually used to initialize
     * Services and other resources.
     */
    onModeEnter: async ({ servicesManager, extensionManager, commandsManager }) => {
      const { segmentationService, displaySetService, viewportGridService, toolbarService, toolGroupService } = servicesManager.services;

      // Init Default and SR ToolGroups
      initToolGroups(extensionManager, toolGroupService, commandsManager);

      toolbarService.addButtons(toolbarButtons);
      toolbarService.addButtons(segmentationButtons);

      toolbarService.createButtonSection('primary', [
        'WindowLevel',
        'RectangleOverlayViewer',
        'RectangleROI',
        'Pan',
        'Zoom',
        'TrackballRotate',
        //'Capture',
        'Layout',
        'Crosshairs',
        'MoreTools',
      ]);
      toolbarService.createButtonSection('segmentationToolbox', ['BrushTools', 'Shapes']);


      console.log("Entering Generative AI Mode...");

      // ✅ Wait for display sets to load
    const displaySets = displaySetService.getActiveDisplaySets();
    if (!displaySets || displaySets.length === 0) {
      console.warn("No display sets found!");
      return;
    }

    console.log("Display Sets: ", displaySets);

    // ✅ Find the CT series (Primary Imaging Data)
    const ctSeries = displaySets.find(ds => ds.Modality === 'CT' || ds.Modality === 'AI');
    if (!ctSeries) {
      console.warn("No CT series found in display sets!");
      return;
    }

    console.log("CT Series Found: ", ctSeries);

    // ✅ Find the Segmentation series
    const segSeries = displaySets.find(ds => ds.Modality === 'SEG');
    if (!segSeries) {
      console.warn("No segmentation series found in display sets.");
      return;
    }

    console.log("Segmentation Series Found: ", segSeries);

    // ✅ Ensure the segmentation is properly linked before assigning it to the viewport
    try {
      console.log("Hydrating segmentation...");
      await segmentationService.hydrateSegmentation();

      // ✅ Explicitly register segmentation before linking it to the viewport
      const segmentationId = segSeries.displaySetInstanceUID;
      segmentationService.addSegmentation({
        segmentationId,
        displaySetInstanceUID: segSeries.displaySetInstanceUID,
      });

      console.log("Segmentation successfully registered:", segmentationId);
    } catch (error) {
      console.error("Error hydrating segmentation: ", error);
    }

    // ✅ Assign segmentation to the correct viewport **AFTER** it is hydrated
    setTimeout(() => {
      const viewports = viewportGridService.getState().viewports;
      if (viewports.length > 0) {
        console.log("Assigning segmentation to viewport...");
        viewportGridService.setDisplaySetsForViewports([
          {
            viewportId: viewports[0].viewportId,
            displaySetInstanceUIDs: [ctSeries.displaySetInstanceUID, segSeries.displaySetInstanceUID],
          },
        ]);
        console.log("Segmentation assigned to viewport.");
      }
    }, 0); // ✅ Prevents state updates during render


    // provide meta Data for rectangle overlay
    // initMetaData();

  },
    onModeExit: ({ servicesManager }) => {
      const {
        toolGroupService,
        syncGroupService,
        segmentationService,
        cornerstoneViewportService,
        uiDialogService,
        uiModalService,
      } = servicesManager.services;

      uiDialogService.dismissAll();
      uiModalService.hide();
      toolGroupService.destroy();
      syncGroupService.destroy();
      segmentationService.destroy();
      cornerstoneViewportService.destroy();
    },
    /** */
    validationTags: {
      study: [],
      series: [],
    },
    /**
     * A boolean return value that indicates whether the mode is valid for the
     * modalities of the selected studies. For instance a PET/CT mode should be
     */
    isValidMode: ({ modalities }) => {
      return { valid: true };
    },
    /**
     * Mode Routes are used to define the mode's behavior. A list of Mode Route
     * that includes the mode's path and the layout to be used. The layout will
     * include the components that are used in the layout. For instance, if the
     * default layoutTemplate is used (id: '@ohif/extension-default.layoutTemplateModule.viewerLayout')
     * it will include the leftPanels, rightPanels, and viewports. However, if
     * you define another layoutTemplate that includes a Footer for instance,
     * you should provide the Footer component here too. Note: We use Strings
     * to reference the component's ID as they are registered in the internal
     * ExtensionManager. The template for the string is:
     * `${extensionId}.{moduleType}.${componentId}`.
     */
    routes: [
      {
        path: 'template',
        layoutTemplate: ({ location, servicesManager }) => {
          return {
            id: ohif.layout,
            props: {
              leftPanels: ['text-input-extension.panelModule.text-input-side-panel'], //, ohif.leftPanel
              //leftPanelClosed: true,
              rightPanels: ['text-input-extension.panelModule.generative-ai-panel'], //segmentation.panelTool
              viewports: [
                {
                  namespace: cornerstone.viewport,
                  displaySetsToDisplay: [ohif.sopClassHandler],
                },
              ],
            },
          };
        },
      },
    ],
    /** List of extensions that are used by the mode */
    extensions: extensionDependencies,
    /** HangingProtocol used by the mode */
    hangingProtocol: ['twoOneGenAI'],
    /** SopClassHandlers used by the mode */
    sopClassHandlers: [ohif.sopClassHandler, segmentation.sopClassHandler],
    /** hotkeys for mode */
    hotkeys: [...hotkeys.defaults.hotkeyBindings],
  };
}

const mode = {
  id,
  modeFactory,
  extensionDependencies,
};

export default mode;
