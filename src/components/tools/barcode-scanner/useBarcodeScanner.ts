import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { BrowserCodeReader, BrowserMultiFormatReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';
import { isExpectedBarcodeMiss, getBarcodeFormatName } from '../../../utils/barcodeScanner';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

export interface CameraOption {
  id: string;
  label: string;
}

type CameraStatus = 'idle' | 'starting' | 'scanning';

function cameraErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      return 'Camera permission was denied. Allow camera access in your browser settings, then try again.';
    }
    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      return 'No camera was found. Connect a camera or use the image upload option.';
    }
    if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      return 'The camera is already in use or could not be started. Close other apps using it and try again.';
    }
    if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
      return 'This camera is unavailable. Select another camera or try again.';
    }
    if (error.name === 'SecurityError' || error.name === 'TypeError') {
      return 'Camera access is blocked. Use HTTPS or localhost and check your browser permissions.';
    }
  }
  return error instanceof Error && error.message
    ? `Could not start the camera: ${error.message}`
    : 'Could not start the camera. Check your camera connection and browser permissions.';
}

function stopVideoTracks(video: HTMLVideoElement | null): void {
  if (!video) return;
  const stream = video.srcObject;
  if (stream instanceof MediaStream) {
    stream.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  }
}

export default function useBarcodeScanner(
  videoRef: RefObject<HTMLVideoElement | null>,
  onDetected: (value: string, format: string) => void,
) {
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [cameraError, setCameraError] = useState('');
  const [cameras, setCameras] = useState<CameraOption[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const controlsRef = useRef<IScannerControls | null>(null);
  const requestIdRef = useRef(0);
  const startPendingRef = useRef(false);
  const mountedRef = useRef(false);
  const detectedCallbackRef = useRef(onDetected);

  useEffect(() => {
    detectedCallbackRef.current = onDetected;
  }, [onDetected]);

  const stopCamera = useCallback(() => {
    requestIdRef.current += 1;
    controlsRef.current?.stop();
    controlsRef.current = null;
    stopVideoTracks(videoRef.current);
    if (mountedRef.current) setStatus('idle');
  }, [videoRef]);

  const startCamera = useCallback(async (deviceId?: string) => {
    if (startPendingRef.current || controlsRef.current) return;
    if (!window.isSecureContext) {
      setCameraError('Camera access requires a secure context. Open ToolBox over HTTPS or localhost.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not available in this browser. Use HTTPS or upload an image instead.');
      return;
    }

    startPendingRef.current = true;
    const requestId = ++requestIdRef.current;
    setCameraError('');
    setStatus('starting');
    const hints = new Map<DecodeHintType, any>([
      [DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.ITF,
        BarcodeFormat.CODABAR,
        BarcodeFormat.PDF_417,
        BarcodeFormat.DATA_MATRIX,
      ]],
      [DecodeHintType.TRY_HARDER, true],
      [DecodeHintType.RETURN_CODABAR_START_END, true],
    ]);

    try {
      const video = videoRef.current;
      if (!video) throw new Error('The camera preview is not ready. Try again.');
      const reader = new BrowserMultiFormatReader(hints);
      const controls = await reader.decodeFromVideoDevice(
        deviceId || undefined,
        video,
        (result, error) => {
          if (requestId !== requestIdRef.current || !mountedRef.current) return;
          if (result) {
            const value = result.getText();
            const format = getBarcodeFormatName(result.getBarcodeFormat(), value);
            if (value) {
              stopCamera();
              detectedCallbackRef.current(value, format);
            }
          } else if (error && !isExpectedBarcodeMiss(error)) {
            setCameraError('The camera scan encountered an error. Stop the camera and try again.');
            stopCamera();
          }
        },
      );

      if (requestId !== requestIdRef.current || !mountedRef.current) {
        controls.stop();
        stopVideoTracks(video);
        return;
      }

      controlsRef.current = controls;
      const stream = video.srcObject;
      const activeDeviceId = stream instanceof MediaStream
        ? stream.getVideoTracks()[0]?.getSettings().deviceId
        : undefined;
      if (activeDeviceId) setSelectedCameraId(activeDeviceId);
      setStatus('scanning');

      try {
        const devices = await BrowserCodeReader.listVideoInputDevices();
        if (requestId === requestIdRef.current && mountedRef.current) {
          const options = devices.map((device, index) => ({
            id: device.deviceId,
            label: device.label || `Camera ${index + 1}`,
          }));
          setCameras(options);
          if (activeDeviceId && options.some((option) => option.id === activeDeviceId)) {
            setSelectedCameraId(activeDeviceId);
          }
        }
      } catch {
        if (requestId === requestIdRef.current && mountedRef.current) {
          setCameraError('Camera is active, but the available camera list could not be refreshed.');
        }
      }
    } catch (error) {
      if (requestId === requestIdRef.current && mountedRef.current) {
        setCameraError(cameraErrorMessage(error));
        setStatus('idle');
        stopVideoTracks(videoRef.current);
      }
    } finally {
      startPendingRef.current = false;
      if (requestId !== requestIdRef.current && mountedRef.current) setStatus('idle');
    }
  }, [stopCamera, videoRef]);

  const switchCamera = useCallback(async (deviceId: string) => {
    if (!deviceId || deviceId === selectedCameraId || startPendingRef.current) return;
    stopCamera();
    setCameraError('');
    await startCamera(deviceId);
  }, [selectedCameraId, startCamera, stopCamera]);

  useEffect(() => {
    const video = videoRef.current;
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      controlsRef.current?.stop();
      controlsRef.current = null;
      stopVideoTracks(video);
    };
  }, [videoRef]);

  return {
    status,
    cameraError,
    cameras,
    selectedCameraId,
    startCamera,
    stopCamera,
    switchCamera,
  };
}
