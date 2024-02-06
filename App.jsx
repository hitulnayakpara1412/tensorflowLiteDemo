/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable curly */
import React, {useEffect, useState} from 'react';
import {Text, View, StyleSheet, TouchableOpacity} from 'react-native';
import {useTensorflowModel} from 'react-native-fast-tflite';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import {Worklets} from 'react-native-worklets-core';
import {useResizePlugin} from 'vision-camera-resize-plugin';

const App = () => {
  const {hasPermission, requestPermission} = useCameraPermission();
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    (async () => {
      await requestPermission();
    })();
  }, []);

  const objectDetection = useTensorflowModel(
    require('./src/assets/model/model.tflite'),
  );
  const model =
    objectDetection.state === 'loaded' ? objectDetection.model : undefined;
  const {resize} = useResizePlugin();

  const onObjectDetected = Worklets.createRunInJsFn(object => {
    if (object[0] >= 0.9 && !isCapturing) {
      setIsCapturing(true);
    } else {
      setIsCapturing(false);
    }
  });

  const frameProcessor = useFrameProcessor(
    frame => {
      'worklet';
      if (model == null) return;
      const data = resize(frame, {
        scale: {
          width: 320,
          height: 320,
        },
        pixelFormat: 'rgb',
        dataType: 'float32',
      });
      const outputs = model.runSync([data]);
      const detection_boxes = outputs[0];
      if (detection_boxes.length > 0) {
        onObjectDetected(detection_boxes);
      }
    },
    [model],
  );

  const device = useCameraDevice('back');

  if (device == null) return <View />;

  return (
    <View style={{flex: 1}}>
      <Camera
        pixelFormat="yuv"
        frameProcessor={frameProcessor}
        style={StyleSheet.absoluteFill}
        device={device}
        photo={true}
        isActive={true}
      />
      <TouchableOpacity
        style={{
          borderColor: isCapturing ? 'yellow' : 'white',
          position: 'absolute',
          width: 50,
          height: 50,
          borderRadius: 25,
          borderWidth: 2,
          alignSelf: 'center',
          bottom: 20,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <View
          style={{
            backgroundColor: isCapturing ? 'yellow' : 'white',
            width: 40,
            height: 40,
            borderRadius: 20,
          }}
        />
      </TouchableOpacity>
    </View>
  );
};
export default App;
