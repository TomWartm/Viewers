import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import i18n from '@ohif/i18n';
import { I18nextProvider } from 'react-i18next';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import Login from './components/Login'; // Import Login component
import SignUp from './components/SignUp'; // Import SignUp component
import ProtectedRoute from './components/ProtectedRoute'; // Import ProtectedRoute component
import Compose from './routes/Mode/Compose';
import {
  ExtensionManager,
  CommandsManager,
  HotkeysManager,
  ServiceProvidersManager,
} from '@ohif/core';
import {
  DialogProvider,
  Modal,
  ModalProvider,
  ThemeWrapper,
  // SnackbarProvider,
  ViewportDialogProvider,
  ViewportGridProvider,
  CineProvider,
  UserAuthenticationProvider,
  ToolboxProvider,
} from '@ohif/ui';
import {
  ThemeWrapper as ThemeWrapperNext,
  NotificationProvider,
  TooltipProvider,
} from '@ohif/ui-next';
import { AppConfigProvider } from '@state';
import createRoutes from './routes';
import appInit from './appInit.js';
import OpenIdConnectRoutes from './utils/OpenIdConnectRoutes';
import SearchHomePage from './components/SearchHomePage'; // Import the new component
import { ShepherdJourneyProvider } from 'react-shepherd';

let commandsManager: CommandsManager,
  extensionManager: ExtensionManager,
  servicesManager: AppTypes.ServicesManager,
  serviceProvidersManager: ServiceProvidersManager,
  hotkeysManager: HotkeysManager;

const requireAuth = true;

function App({
  config = {
    routerBaseName: '/',
    showLoadingIndicator: true,
    showStudyList: true,
    oidc: [],
    extensions: [],
  },
  defaultExtensions = [],
  defaultModes = [],
}) {
  const [init, setInit] = useState(null);

  useEffect(() => {
    const run = async () => {
      appInit(config, defaultExtensions, defaultModes).then(setInit).catch(console.error);
    };

    run();
  }, []);

  if (!init) {
    return null;
  }

  // Set above for named export
  commandsManager = init.commandsManager;
  extensionManager = init.extensionManager;
  servicesManager = init.servicesManager;
  serviceProvidersManager = init.serviceProvidersManager;
  hotkeysManager = init.hotkeysManager;

  // Set appConfig
  const appConfigState = init.appConfig;
  const { routerBasename, modes, dataSources, oidc, showStudyList } = appConfigState;

  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2');
  const max3DTextureSize = gl.getParameter(gl.MAX_3D_TEXTURE_SIZE);
  appConfigState.max3DTextureSize = max3DTextureSize;

  const {
    uiDialogService,
    uiModalService,
    uiViewportDialogService,
    viewportGridService,
    cineService,
    userAuthenticationService,
    uiNotificationService,
    customizationService,
  } = servicesManager.services;

  const providers = [
    [AppConfigProvider, { value: appConfigState }],
    [UserAuthenticationProvider, { service: userAuthenticationService }],
    [I18nextProvider, { i18n }],
    [ThemeWrapperNext],
    [ThemeWrapper],
    [ToolboxProvider],
    [ViewportGridProvider, { service: viewportGridService }],
    [ViewportDialogProvider, { service: uiViewportDialogService }],
    [CineProvider, { service: cineService }],
    // [SnackbarProvider, { service: uiNotificationService }],
    [NotificationProvider, { service: uiNotificationService }],
    [TooltipProvider],
    [DialogProvider, { service: uiDialogService }],
    [ModalProvider, { service: uiModalService, modal: Modal }],
    [ShepherdJourneyProvider],
  ];

  // Loop through and register each of the service providers registered with the ServiceProvidersManager.
  const providersFromManager = Object.entries(serviceProvidersManager.providers);
  if (providersFromManager.length > 0) {
    providersFromManager.forEach(([serviceName, provider]) => {
      providers.push([provider, { service: servicesManager.services[serviceName] }]);
    });
  }

  const CombinedProviders = ({ children }) => Compose({ components: providers, children });

  // Create routes using config
  const appRoutes = createRoutes({
    modes,
    dataSources,
    extensionManager,
    servicesManager,
    commandsManager,
    hotkeysManager,
    routerBasename,
    showStudyList,
  });

  let authRoutes = null;
  customizationService.init(extensionManager);

  if (oidc) {
    authRoutes = (
      <OpenIdConnectRoutes
        oidc={oidc}
        routerBasename={routerBasename}
        userAuthenticationService={userAuthenticationService}
      />
    );
  }

  return (
    <CombinedProviders>
      <BrowserRouter basename={routerBasename}>
        <Routes>
              <Route
                path="/login"
                element={<Login />}
              />
              <Route
                path="/signup"
                element={<SignUp />}
              />
              <Route
                path="/search"
                element={
                  <ProtectedRoute>
                    <SearchHomePage />
                  </ProtectedRoute>
                }
              />
              {requireAuth ? (
                <>
                  <Route
                    path="/"
                    element={<ProtectedRoute>{appRoutes}</ProtectedRoute>}
                  />
                </>
              ) : (
                <>
                </>
              )}
        </Routes>
      </BrowserRouter>
    </CombinedProviders>
  );
}

App.propTypes = {
  config: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({
      routerBasename: PropTypes.string.isRequired,
      oidc: PropTypes.array,
      whiteLabeling: PropTypes.object,
      extensions: PropTypes.array,
    }),
  ]).isRequired,
  defaultExtensions: PropTypes.array,
  defaultModes: PropTypes.array,
};

export default App;
export { commandsManager, extensionManager, servicesManager };
