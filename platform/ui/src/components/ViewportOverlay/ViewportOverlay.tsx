import React from 'react';
import classnames from 'classnames';
import { getRenderingEngine, metaData, StackViewport } from '@cornerstonejs/core';
import './ViewportOverlay.css';

export type ViewportOverlayProps = {
  topLeft: React.ReactNode;
  topRight: React.ReactNode;
  bottomRight: React.ReactNode;
  bottomLeft: React.ReactNode;
  color?: string;
};

const ViewportOverlay = ({
  topLeft,
  topRight,
  bottomRight,
  bottomLeft,
  color = 'text-primary-light',
}: ViewportOverlayProps) => {
  const overlay = 'absolute pointer-events-none viewport-overlay';

  return (
    <div
      className={classnames(
        color ? color : 'text-aqua-pale',
        'text-[13px]',
        'leading-5',
        'overlay-text'
      )}
    >
      <div
        data-cy={'viewport-overlay-top-left'}
        className={classnames(overlay, 'overlay-top left-viewport')}
      >
        {topLeft}
      </div>
      <div
        data-cy={'viewport-overlay-top-right'}
        className={classnames(overlay, 'overlay-top right-viewport-scrollbar')}
      >
        {topRight}

        {/* 🔹 Updated Explain Button */}
        <button
          style={{
            padding: '5px 10px',
            backgroundColor: '#00bcd4',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            borderRadius: '5px',
            pointerEvents: 'all',
          }}
          onClick={async event => {
            console.log('🟢 Explain button clicked!');
            // ✅ Find the viewport element dynamically
            let viewportElement = event.currentTarget
              .closest('.viewport-wrapper')
              ?.querySelector('.cornerstone-viewport-element');

            if (!viewportElement) {
              viewportElement = document.querySelector('.cornerstone-viewport-element'); // Fallback
            }

            if (!viewportElement) {
              console.warn('❌ No viewport element found!');
              return;
            }

            console.log('🖼️ Found Viewport Element:', viewportElement);

            // ✅ Retrieve viewport ID
            const viewportId = viewportElement.getAttribute('data-viewport-uid');
            if (!viewportId) {
              console.warn('❌ No valid viewport ID found!');
              return;
            }

            console.log('📌 Viewport ID:', viewportId);

            // ✅ Get the rendering engine and viewport
            const renderingEngine = getRenderingEngine('OHIFCornerstoneRenderingEngine');
            if (!renderingEngine) {
              console.error('❌ No rendering engine found!');
              return;
            }

            const viewport = renderingEngine.getViewport(viewportId);
            if (!viewport) {
              console.error('❌ Viewport not found!');
              return;
            }

            if (!(viewport instanceof StackViewport)) {
              console.error('❌ Not a StackViewport.');
              return;
            }

            // ✅ Get the current image index and image ID
            const imageId = viewport.getCurrentImageId();
            console.log(imageId);

            // ✅ Retrieve Study Instance UID from metadata
            const studyInstanceUID = metaData.get('StudyInstanceUID', imageId);
            if (!studyInstanceUID) {
              console.warn('❌ No Study Instance UID found for this image!');
              return;
            }

            const seriesUID = metaData.get('SeriesInstanceUID', imageId);
            if (!seriesUID) {
              console.warn('❌ No Study Instance UID found for this image!');
              return;
            }

            const seriesInstanceUID = metaData.get('SeriesInstanceUID', imageId);
            const instanceNumber = metaData.get('InstanceNumber', imageId);

            console.log(`📋 Study Instance UID: ${studyInstanceUID}`);
            console.log(`📋 Series Instance UID: ${seriesInstanceUID}`);
            console.log(`📋 Instance Number: ${instanceNumber}`);
          }}
        >
          Explain
        </button>
      </div>
      <div
        data-cy={'viewport-overlay-bottom-right'}
        className={classnames(overlay, 'overlay-bottom right-viewport-scrollbar')}
      >
        {bottomRight}
      </div>
      <div
        data-cy={'viewport-overlay-bottom-left'}
        className={classnames(overlay, 'overlay-bottom left-viewport')}
      >
        {bottomLeft}
      </div>
    </div>
  );
};

export default ViewportOverlay;
