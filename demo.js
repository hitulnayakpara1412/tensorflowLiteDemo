/* eslint-disable react-native/no-inline-styles */
/* eslint-disable curly */
/* eslint-disable radix */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {styles} from './styles';
import Header from '../../../components/Header';
import {NavConstant} from '../../../helper/constants/NavConstant';
import {
  Animated,
  Easing,
  Image,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {Images} from '../../../helper/images/Images';
import {height} from '../../../helper/scale/Scale';
import RBSheet from 'react-native-raw-bottom-sheet';
import Loader from '../../../components/Loader';
import axios from 'axios';
import ImageCropPicker from 'react-native-image-crop-picker';
import Container from '../../../components/Container';
import {Colors} from '../../../helper/color/colors';
import {
  Camera,
  useCameraDevices,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
// import {detectObjects} from 'vision-camera-realtime-object-detection';
// import {runOnJS} from 'react-native-reanimated';
import WarningPopup from '../../../components/WarningPopup';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import ApiConstants, {LIVE_KEY} from '../../../features/apis/apiConstant';
import {t} from 'i18next';
import {checkNetworkConnection} from '../../../components/Network';
import Toast from 'react-native-toast-message';
import {request, PERMISSIONS} from 'react-native-permissions';

let warningMessage = '';

const Search = ({navigation}) => {
  const [flashMode, setFlashMode] = useState('off');
  const [isCapturing, setIsCapturing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isShowLabel, setIsShowLabel] = useState(true);
  const [objects, setObjects] = useState([]);
  const [popup, setPopup] = useState(false);

  const helpSheetRef = useRef(null);
  const cameraRef = useRef(null);
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // startAnimation();
    setTimeout(() => {
      // setIsShowLabel(false);
    }, 5000);
    requestCameraPermission('camera');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  const {hasPermission, requestPermission} = useCameraPermission();
  console.log('🚀 ~ Search ~ hasPermission:', hasPermission);

  const requestCameraPermission = async value => {
    try {
      if (value === 'camera') {
        if (Platform.OS === 'ios') {
          await requestPermission();
          // const granted = await request(PERMISSIONS.IOS.CAMERA);
        } else {
          const granted = await PermissionsAndroid.request(
            'android.permission.CAMERA',
          );
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            console.log('You can use the camera');
          } else {
            console.log('Camera permission denied');
          }
        }
      } else {
        const granted = await PermissionsAndroid.request(
          'android.permission.READ_MEDIA_IMAGES',
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('You can use the images');
        } else {
          console.log('Camera permission denied');
        }
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const startAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  };

  const animatedStyle = {
    transform: [
      {
        translateY: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 360],
        }),
      },
    ],
  };

  const handleGalleryPress = async () => {
    requestCameraPermission('image');
    await ImageCropPicker.openPicker({
      mediaType: 'photo',
      cropping: true,
    })
      .then(async image => {
        const isConnected = await checkNetworkConnection();
        if (isConnected) {
          setLoading(true);
          const pathParts = image.path.split('/');
          const filename = pathParts[pathParts.length - 1];
          const response = await imageSendToServer(
            image.path,
            filename,
            image.mime,
          );
          if (response.statusCode === 200) {
            if (response.data.listdata.length > 0) {
              navigation.navigate(NavConstant.SearchStack, {
                screen: NavConstant.SearchCategory,
                params: {
                  data: response.data.listdata,
                  refreshScreen: () => {
                    console.log('Refreshing ScreenB...');
                  },
                },
              });
            } else {
              warningMessage = t('search.scan_proper');
              setPopup(true);
            }
            setLoading(false);
          } else {
            warningMessage = t('search.please_rescan');
            setPopup(true);
            setLoading(false);
          }
        } else {
          Toast.show({text1: t('toast.network')});
        }
      })
      .catch(err => {
        console.error('User Not Select Image', err);
        setLoading(false);
      });
  };

  const imageSendToServer = async (uri, fileName, type) => {
    const formData = new FormData();
    formData.append('image', {
      uri: uri,
      name: fileName,
      type: type,
    });
    try {
      const request = await axios.post(ApiConstants.getPrediction, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ApiKey: LIVE_KEY,
        },
      });
      return request.data;
    } catch (error) {
      console.error('Axios Error :::', error);
      warningMessage = t('search.something_went_wrong');
      setPopup(true);
      return null;
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const isConnected = await checkNetworkConnection();
      if (isConnected) {
        setLoading(true);
        try {
          const options = {quality: 0.5, base64: false};
          const data = await cameraRef.current.takePhoto(options);
          const path = `file://${data.path}`;
          const pathParts = data.path.split('/');
          const filename = pathParts[pathParts.length - 1];
          const response = await imageSendToServer(
            path,
            filename,
            'image/jpeg',
          );
          if (response.statusCode === 200) {
            if (response.data.listdata.length > 0) {
              navigation.navigate(NavConstant.SearchStack, {
                screen: NavConstant.SearchCategory,
                params: {
                  data: response.data.listdata,
                  refreshScreen: () => {
                    console.log('Refreshing ScreenB...');
                  },
                },
              });
            } else {
              warningMessage = t('search.scan_proper');
              setPopup(true);
            }
            setLoading(false);
          } else {
            warningMessage = t('search.please_rescan');
            setPopup(true);
            setLoading(false);
          }
        } catch (e) {
          console.error('Take Picture Error ::', e);
          setLoading(false);
        }
      } else {
        Toast.show({text1: t('toast.network')});
      }
    }
  };

  const handlePress = () => {
    takePicture();
  };

  // const frameProcessorConfig = {
  //   modelFile: 'model.tflite',
  //   scoreThreshold: 0.4,
  //   maxResults: 1,
  //   numThreads: 4,
  // };

  const frameProcessor = useFrameProcessor(frame => {
    'worklet';
    console.log('🚀 ~ frameProcessor ~ frame:', frame);
    // const detectedObjects = detectObjects(frame, frameProcessorConfig);
    // runOnJS(setObjects)(
    //   detectedObjects.map(obj => ({
    //     ...obj,
    //   })),
    // );
  }, []);

  const devices = useCameraDevices('back');
  // console.log('🚀 ~ Search ~ devices:', devices);

  if (devices == null) return <View />;
  return (
    <Container>
      {loading && (
        <Loader loading={loading} title={t('search.searching_wine')} />
      )}
      <Header
        title={`${t('tab.search')} /`}
        secondTitle={t('tab.decant')}
        backPress={() => navigation.goBack()}
        isSearch={true}
        searchPress={() =>
          navigation.navigate(NavConstant.SearchStack, {
            screen: NavConstant.SearchCategory,
            params: {
              number: Math.random(),
              // refreshScreen: () => {
              //   console.log('Refreshing ScreenB...', Math.random());
              // },
            },
          })
        }
      />
      <View style={styles.container}>
        {hasPermission && (
          <Camera
            // frameProcessorFps={5}
            frameProcessor={frameProcessor}
            style={StyleSheet.absoluteFill}
            device={devices}
            // ref={cameraRef}
            photo={true}
            // torch={flashMode}
            isActive={true}
            pixelFormat="yuv"
          />
        )}

        {isShowLabel && (
          <View
            style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
            <Text style={styles.title}>Position the</Text>
            <Text style={[styles.title, {fontSize: hp(3)}]}>
              {t('search.wine_label')}
            </Text>
            <Text style={styles.title}>{t('search.within_frame')}</Text>
          </View>
        )}
        {/* ----- Camera Border ----- */}
        <Image
          source={isCapturing ? Images.cameraYellowBorder : Images.cameraBorder}
          style={styles.cameraBorder}
          resizeMode="contain"
        />
        {/* ----- Help Button ----- */}
        <TouchableOpacity
          onPress={() => {
            helpSheetRef.current.open();
          }}
          style={styles.helpButton}>
          <Image
            source={Images.help}
            style={styles.flashIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        {/* ----- Flash Button ----- */}
        <TouchableOpacity
          onPress={() => {
            setFlashMode(flashMode === 'on' ? 'off' : 'on');
          }}
          style={styles.flashButton}>
          <Image
            source={flashMode === 'off' ? Images.flashoff : Images.Flash}
            style={styles.flashIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        {/* ----- Animated Line */}
        <View style={styles.scannerContainer}>
          {!isCapturing && (
            <Animated.Image
              source={Images.animatedLine}
              style={[styles.scannerLine, animatedStyle]}
            />
          )}
        </View>
        {/* ----- Capture Button ----- */}
        <TouchableOpacity
          style={[
            styles.captureButton,
            {
              borderColor: isCapturing ? Colors.yellow : Colors.white,
            },
          ]}
          onPress={handlePress}>
          <View
            style={[
              styles.captureInnerView,
              {
                backgroundColor: isCapturing ? Colors.yellow : Colors.white,
              },
            ]}
          />
        </TouchableOpacity>
        {/* ----- Gallery Button ----- */}
        <TouchableOpacity
          onPress={handleGalleryPress}
          style={styles.galleryButton}>
          <Image
            source={Images.galary}
            style={styles.galleryIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
      <RBSheet
        ref={helpSheetRef}
        height={height / 1.25}
        openDuration={250}
        customStyles={{
          container: {
            borderTopLeftRadius: wp(6),
            borderTopRightRadius: wp(6),
          },
        }}>
        <View
          style={{
            paddingHorizontal: wp(8),
            paddingTop: hp(2.4),
          }}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => helpSheetRef.current.close()}>
            <Image
              source={Images.closePink}
              style={{width: wp(4)}}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <ScrollView contentContainerStyle={{paddingBottom: hp(8)}}>
            <View style={styles.sheetContainer}>
              <Text style={styles.sheetTitle}>
                {t('search.frame_whole_label')}
              </Text>
              <Text style={styles.sheetSmallTitle}>
                {t('search.get_the_edges_frame')}
              </Text>
              <View style={{flexDirection: 'row'}}>
                <View style={styles.imageView}>
                  <Image
                    source={Images.helpBottle}
                    style={styles.BottleImage}
                  />
                  <View style={styles.wrongImageView}>
                    <Image
                      source={Images.correctIcon}
                      style={styles.correctIcon}
                      resizeMode="contain"
                    />
                  </View>
                </View>
                <View style={[styles.imageView, {marginLeft: wp(2.4)}]}>
                  <Image
                    source={Images.helpBottle}
                    style={styles.BottleImage}
                  />
                  <View style={styles.wrongImageView}>
                    <Image
                      source={Images.closePink}
                      style={styles.wrongIcon}
                      resizeMode="contain"
                    />
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.sheetContainer}>
              <Text style={[styles.sheetTitle, {marginTop: hp(1.2)}]}>
                {t('search.keep_you_phone')}
              </Text>
              <Text style={styles.sheetSmallTitle}>
                {t('search.make_photo')} {t('search.keep_hand_holding')}
              </Text>
              <View style={{flexDirection: 'row'}}>
                <View style={styles.imageView}>
                  <Image
                    source={Images.helpBottle}
                    style={styles.BottleImage}
                  />
                  <View style={styles.wrongImageView}>
                    <Image
                      source={Images.correctIcon}
                      style={styles.correctIcon}
                      resizeMode="contain"
                    />
                  </View>
                </View>
                <View style={[styles.imageView, {marginLeft: wp(2.4)}]}>
                  <Image
                    source={Images.helpBottle}
                    style={styles.BottleImage}
                  />
                  <View style={styles.wrongImageView}>
                    <Image
                      source={Images.closePink}
                      style={styles.wrongIcon}
                      resizeMode="contain"
                    />
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.sheetContainer}>
              <Text style={[styles.sheetTitle, {marginTop: hp(1.2)}]}>
                {t('search.keep_eye_on_light')}
              </Text>
              <Text style={styles.sheetSmallTitle}>
                {t('search.make_label')}
              </Text>
              <View style={{flexDirection: 'row'}}>
                <View style={styles.imageView}>
                  <Image
                    source={Images.helpBottle}
                    style={styles.BottleImage}
                  />
                  <View style={styles.wrongImageView}>
                    <Image
                      source={Images.correctIcon}
                      style={styles.correctIcon}
                      resizeMode="contain"
                    />
                  </View>
                </View>
                <View style={[styles.imageView, {marginLeft: wp(2.4)}]}>
                  <Image
                    source={Images.helpBottle}
                    style={styles.BottleImage}
                  />
                  <View style={styles.wrongImageView}>
                    <Image
                      source={Images.closePink}
                      style={styles.wrongIcon}
                      resizeMode="contain"
                    />
                  </View>
                </View>
                <View style={[styles.imageView, {marginLeft: wp(2.4)}]}>
                  <Image
                    source={Images.helpBottle}
                    style={styles.BottleImage}
                  />
                  <View style={styles.wrongImageView}>
                    <Image
                      source={Images.closePink}
                      style={styles.wrongIcon}
                      resizeMode="contain"
                    />
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </RBSheet>
      <WarningPopup
        buttonPress={() => {
          setPopup(false);
          setLoading(false);
        }}
        buttonTitle={'OK'}
        isVisible={popup}
        description={warningMessage}
      />
    </Container>
  );
};
export default Search;
