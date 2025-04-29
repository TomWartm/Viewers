const getCommandsModule = ({ servicesManager, commandsManager }) => ({
  actions: {
    toggleImageOverlay: () => {
      const { cornerstoneViewportService } = servicesManager.services;
      const element = cornerstoneViewportService.getActiveViewportEnabledElement();

      if (!element) {
        console.warn('No active viewport found.');
        return;
      }

      try {
        const overlayImageId = 'wadouri:https://yourserver.com/heatmap.dcm';

        cornerstone.loadImage(overlayImageId).then((overlayImage) => {
          cornerstone.displayOverlayImage(element, overlayImage);
        });
      } catch (error) {
        console.error(error);
      }

    },
  },
  definitions: {
    toggleImageOverlay: {
      commandFn: () => commandsManager.runCommand('toggleImageOverlay'),
      storeContexts: [],
      options: {},
    },
  },
});

export default getCommandsModule;
