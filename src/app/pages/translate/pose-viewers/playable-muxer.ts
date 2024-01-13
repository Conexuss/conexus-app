import type {ArrayBufferTarget as WebmArrayBufferTarget, Muxer as WebmMuxer} from 'webm-muxer';
import type {ArrayBufferTarget as Mp4ArrayBufferTarget, Muxer as Mp4Muxer} from 'mp4-muxer';

export class PlayableVideoEncoder {
  muxer: WebmMuxer<WebmArrayBufferTarget> | Mp4Muxer<Mp4ArrayBufferTarget>;
  videoEncoder: VideoEncoder;

  container: 'webm' | 'mp4';
  codec: string;
  bitrate = 1_000_000_000; // 1Gbps
  alpha = true;

  width: number;
  height: number;

  constructor(private image: ImageBitmap, private fps: number) {}

  static isSupported() {
    return 'VideoEncoder' in globalThis;
  }

  async init() {
    await this.createWebMMuxer();
    let playable = await this.isPlayable();

    if (!playable) {
      // If WebM is not playable or undetermined, fall back to MP4
      await this.createMP4Muxer();
    }

    this.createVideoEncoder();
  }

  async isPlayable() {
    if (!('navigator' in globalThis)) {
      return false;
    }

    if (!('mediaCapabilities' in navigator)) {
      const mimeType = `video/${this.container}; codecs="${this.codec}"`;
      return MediaSource.isTypeSupported(mimeType);
    }

    const videoConfig = {
      contentType: `video/${this.container}; codecs="${this.codec}"`,
      width: 1280, // Replace with actual width
      height: 720, // Replace with actual height
      bitrate: this.bitrate,
      framerate: this.fps,
      hasAlphaChannel: this.alpha,
    };

    const result = await navigator.mediaCapabilities.decodingInfo({type: 'file', video: videoConfig});
    console.log(result);
    const {supported} = result;
    return supported;
  }

  async createWebMMuxer() {
    const {Muxer, ArrayBufferTarget} = await import('webm-muxer');

    // Set the metadata
    this.container = 'webm';
    this.codec = 'vp09.00.10.08';
    this.width = this.image.width;
    this.height = this.image.height;

    // Create the muxer
    this.muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: {
        codec: 'V_VP9',
        width: this.width,
        height: this.height,
        frameRate: this.fps,
        alpha: this.alpha,
      },
    });
  }

  async createMP4Muxer() {
    const {Muxer, ArrayBufferTarget} = await import('mp4-muxer');

    // Set the metadata
    this.container = 'mp4';
    this.codec = 'avc1.42001f';
    // H264 only supports even sized frames
    this.width = this.image.width + (this.image.width % 2);
    this.height = this.image.height + (this.image.height % 2);

    // Create the muxer
    this.muxer = new Muxer({
      target: new ArrayBufferTarget(),
      fastStart: 'in-memory',
      video: {
        codec: 'avc',
        width: this.width,
        height: this.height,
      },
    });
  }

  createVideoEncoder() {
    this.videoEncoder = new VideoEncoder({
      output: (chunk, meta) => this.muxer.addVideoChunk(chunk, meta),
      error: e => console.error(e),
    });
    const config = {
      codec: this.codec,
      width: this.width,
      height: this.height,
      bitrate: this.bitrate,
      framerate: this.fps,
      // TODO: this is not yet supported in Chrome https://chromium.googlesource.com/chromium/src/+/master/third_party/blink/renderer/modules/webcodecs/video_encoder.cc#242
      // alpha: this.muxer.alpha ? 'keep' as AlphaOption : false
    };
    this.videoEncoder.configure(config);
  }

  addFrame(index: number, image: ImageBitmap) {
    const ms = 1_000_000; // 1µs
    const frame = new VideoFrame(image, {
      timestamp: (ms * index) / this.fps,
      duration: ms / this.fps,
    });
    this.videoEncoder.encode(frame);
    frame.close();
  }

  async finalize() {
    await this.videoEncoder.flush();
    this.muxer.finalize();
    this.videoEncoder.close();
    delete this.videoEncoder;

    let {buffer} = this.muxer.target; // Buffer contains final muxed file
    return new Blob([buffer], {type: `video/${this.container}`});
  }

  close() {
    if (this.videoEncoder) {
      this.videoEncoder.close();
      delete this.videoEncoder;
    }
    if (this.muxer) {
      delete this.muxer;
    }
  }
}
