declare module 'expo-image-picker' {
  export type ImagePickerAsset = {
    uri: string;
    width: number;
    height: number;
    duration?: number | null;
    mimeType?: string | null;
    fileName?: string | null;
  };

  export type ImagePickerResult =
    | { canceled: true; assets: null }
    | { canceled: false; assets: ImagePickerAsset[] };

  export function requestCameraPermissionsAsync(): Promise<{ granted: boolean }>;
  export function requestMediaLibraryPermissionsAsync(): Promise<{ granted: boolean }>;
  export function launchCameraAsync(options: {
    mediaTypes: 'videos'[];
    allowsEditing: boolean;
    quality: number;
    videoMaxDuration: number;
  }): Promise<ImagePickerResult>;
  export function launchImageLibraryAsync(options: {
    mediaTypes: 'videos'[];
    allowsEditing: boolean;
    quality: number;
    selectionLimit: number;
  }): Promise<ImagePickerResult>;
}

declare module 'expo-media-library' {
  export function requestPermissionsAsync(
    writeOnly?: boolean,
    granularPermissions?: ('photo' | 'video' | 'audio')[],
  ): Promise<{ granted: boolean }>;

  export class Asset {
    static create(localUri: string): Promise<Asset>;
  }
}

declare module 'react-native-compressor' {
  export type VideoMetadata = {
    duration?: string | number;
    extension?: string;
    height?: string | number;
    size?: string | number;
    width?: string | number;
    codec?: string;
    rotation?: string | number;
  };

  export function getVideoMetaData(path: string): Promise<VideoMetadata>;

  export const Video: {
    compress(
      url: string,
      options: {
        compressionMethod: 'manual';
        maxSize: number;
        minimumFileSizeForCompress: number;
        progressDivider: number;
        getCancellationId: (id: string) => void;
      },
      onProgress: (progress: number) => void,
    ): Promise<string>;
    cancelCompression(id: string): void;
  };
}
