import { VolumeViewport, metaData, utilities } from '@cornerstonejs/core';
import { IStackViewport, IVolumeViewport, Point3 } from '@cornerstonejs/core/dist/esm/types';
import { AnnotationDisplayTool, drawing } from '@cornerstonejs/tools';
import { guid, b64toBlob } from '@ohif/core/src/utils';


/**
 * Rectangle Overlay Viewer tool retrieves metadata about rectangles, plots them and lets the user toggle the visibility.
 * It is similar to ImageOverlayViewerTool but is for shapes (i.e. rectangles) instead o images.
 */
class RectangleOverlayViewerTool extends AnnotationDisplayTool {
  static toolName = 'RectangleOverlayViewer';

  constructor(
    toolProps = {},
    defaultToolProps = {
      supportedInteractionTypes: [],
      configuration: {
        fillColor: [255, 127, 127, 255],
      },
    }
  ) {
    super(toolProps, defaultToolProps);
  }

  onSetToolDisabled = (): void => {};

  protected getReferencedImageId(viewport: IStackViewport | IVolumeViewport): string {
    if (viewport instanceof VolumeViewport) {
      return;
    }

    const targetId = this.getTargetId(viewport);
    return targetId.split('imageId:')[1];
  }

  renderAnnotation = (enabledElement, svgDrawingHelper) => {

    const { viewport } = enabledElement;
    const imageId = this.getReferencedImageId(viewport);

    if (!imageId) {
      return;
    }

    // recieve metadata of this imageId from metadata provided
    var rectMetadata = metaData.get('Overlay', imageId);

    // TODO: check interface of rectMetadata
    if (rectMetadata) {
      this._renderRectangles(enabledElement, svgDrawingHelper, rectMetadata);

    }

    return true;
  };

  private  _renderRectangles(enabledElement, svgDrawingHelper, rectangles) {
    const { viewport } = enabledElement;
    const imageId = this.getReferencedImageId(viewport);
    const svgns = 'http://www.w3.org/2000/svg';


    for(const rectangle of rectangles){
      const metaData = rectangle.attributes;

      const x = metaData.x; // center of rectangle x-coord
      const y = metaData.y; // center of rectangle y-coord
      const width = metaData.width; // width of rectangle
      const height = metaData.height; // height of rectangle
      const color = metaData.color; // color of the rectangle

      // Calculate world and canvas coordinates for the rectangle
      const overlayTopLeftWorldPos = utilities.imageToWorldCoords(imageId, [x - width / 2, y - height / 2]);
      const overlayTopLeftOnCanvas = viewport.worldToCanvas(overlayTopLeftWorldPos);
      const overlayBottomRightWorldPos = utilities.imageToWorldCoords(imageId, [x + width / 2, y + height / 2]);
      const overlayBottomRightOnCanvas = viewport.worldToCanvas(overlayBottomRightWorldPos);

      // Define rectangle attributes
      const rectId = `rectangle-overlay-${rectangle.id}`;


      const rectAttributes = {
          'data-id': rectId,
          width: overlayBottomRightOnCanvas[0] - overlayTopLeftOnCanvas[0],
          height: overlayBottomRightOnCanvas[1] - overlayTopLeftOnCanvas[1],
          x: overlayTopLeftOnCanvas[0],
          y: overlayTopLeftOnCanvas[1],
          fill: 'none', //`rgba(${color.join(',')})`, // Convert color array to CSS rgba string
          'stroke-width': 2,
          stroke: `rgba(${color.join(',')})`,
      };

      // Create or update the rectangle element in the SVG
      const rectElement = svgDrawingHelper.getSvgNode(rectId);
      if (rectElement) {
          drawing.setAttributesIfNecessary(rectAttributes, rectElement);
          svgDrawingHelper.setNodeTouched(rectId);
      } else {
          const rectElement = document.createElementNS(svgns, 'rect');
          drawing.setNewAttributesIfValid(rectAttributes, rectElement);
          svgDrawingHelper.appendNode(rectElement, rectId);
      }
    };
  }

}

export default RectangleOverlayViewerTool;
