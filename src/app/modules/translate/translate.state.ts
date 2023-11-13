import {Injectable} from '@angular/core';
import {Action, NgxsOnInit, State, StateContext, Store} from '@ngxs/store';
import {
  ChangeTranslation,
  CopySignedLanguageVideo,
  DownloadSignedLanguageVideo,
  FlipTranslationDirection,
  SetInputMode,
  SetSignedLanguage,
  SetSignedLanguageVideo,
  SetSignWritingText,
  SetSpokenLanguage,
  SetSpokenLanguageText,
  ShareSignedLanguageVideo,
  SuggestAlternativeText,
  UploadPoseFile,
} from './translate.actions';
import {TranslationService} from './translate.service';
import {SetVideo, StartCamera, StopVideo} from '../../core/modules/ngxs/store/video/video.actions';
import {EMPTY, filter, Observable} from 'rxjs';
import {PoseViewerSetting} from '../settings/settings.state';
import {map, tap} from 'rxjs/operators';
import {Capacitor} from '@capacitor/core';
import {SignWritingService} from '../sign-writing/sign-writing.service';
import {SignWritingTranslationService} from './signwriting-translation.service';

export type InputMode = 'webcam' | 'upload' | 'text';

export interface TranslateStateModel {
  spokenToSigned: boolean;
  inputMode: InputMode;

  spokenLanguage: string;
  signedLanguage: string;
  detectedLanguage: string;

  spokenLanguageText: string;
  normalizedSpokenLanguageText?: string;
  signWriting: string[];
  signedLanguagePose: string; // TODO: use Pose object instead of URL
  signedLanguageVideo: string;
}

const initialState: TranslateStateModel = {
  spokenToSigned: true,
  inputMode: 'text',

  spokenLanguage: 'en',
  signedLanguage: 'ase',
  detectedLanguage: null,

  spokenLanguageText: '',
  normalizedSpokenLanguageText: null,
  signWriting: [],
  signedLanguagePose: null,
  signedLanguageVideo: null,
};

@Injectable()
@State<TranslateStateModel>({
  name: 'translate',
  defaults: initialState,
})
export class TranslateState implements NgxsOnInit {
  poseViewerSetting$!: Observable<PoseViewerSetting>;

  constructor(
    private store: Store,
    private service: TranslationService,
    private swService: SignWritingTranslationService
  ) {
    this.poseViewerSetting$ = this.store.select<PoseViewerSetting>(state => state.settings.poseViewer);
  }

  ngxsOnInit({dispatch, patchState}: StateContext<TranslateStateModel>): any {
    const searchParams = 'window' in globalThis ? window.location.search : '';
    const urlParams = new URLSearchParams(searchParams);
    const urlSignedLanguage = urlParams.get('sil');
    if (urlSignedLanguage) {
      patchState({signedLanguage: urlSignedLanguage});
    }
    const urlSpokenLanguage = urlParams.get('spl');
    if (urlSpokenLanguage) {
      patchState({spokenLanguage: urlSpokenLanguage});
    }

    dispatch(ChangeTranslation);

    // Reset video whenever viewer setting changes
    this.poseViewerSetting$.pipe(tap(() => dispatch(new SetSignedLanguageVideo(null)))).subscribe();
  }

  @Action(FlipTranslationDirection)
  async flipTranslationMode({getState, patchState, dispatch}: StateContext<TranslateStateModel>): Promise<void> {
    const {spokenToSigned, spokenLanguage, signedLanguage, detectedLanguage, signedLanguageVideo} = getState();
    patchState({
      spokenToSigned: !spokenToSigned,
      // Collapse detected language if used
      spokenLanguage: spokenLanguage ?? detectedLanguage,
      signedLanguage: signedLanguage ?? detectedLanguage,
      detectedLanguage: null,
      signedLanguageVideo: null,
    });

    if (spokenToSigned) {
      if (signedLanguageVideo) {
        dispatch([new SetInputMode('upload'), new SetVideo(signedLanguageVideo)]);
      } else {
        dispatch(new SetInputMode('webcam'));
      }
    } else {
      dispatch(new SetInputMode('text'));
    }
  }

  @Action(SetInputMode)
  async setInputMode(
    {patchState, getState, dispatch}: StateContext<TranslateStateModel>,
    {mode}: SetInputMode
  ): Promise<void> {
    const {inputMode} = getState();
    if (inputMode === mode) {
      return;
    }

    patchState({inputMode: mode});

    dispatch([StopVideo, ChangeTranslation]);

    if (mode === 'webcam') {
      dispatch(StartCamera);
    }
  }

  async detectLanguage(spokenLanguageText: string, patchState: StateContext<TranslateStateModel>['patchState']) {
    if (spokenLanguageText.length === 0) {
      patchState({detectedLanguage: null});
      return;
    }

    await this.service.initCld();
    const detectedLanguage = await this.service.detectSpokenLanguage(spokenLanguageText);
    patchState({detectedLanguage});
  }

  @Action(SetSpokenLanguage)
  async setSpokenLanguage(
    {patchState, getState, dispatch}: StateContext<TranslateStateModel>,
    {language}: SetSpokenLanguage
  ): Promise<void> {
    patchState({spokenLanguage: language});

    // Load and apply language detection if selected
    if (!language) {
      const {spokenLanguageText} = getState();
      await this.detectLanguage(spokenLanguageText, patchState);
    }

    dispatch([ChangeTranslation, SuggestAlternativeText]);
  }

  @Action(SetSignedLanguage)
  async setSignedLanguage(
    {patchState, dispatch}: StateContext<TranslateStateModel>,
    {language}: SetSignedLanguage
  ): Promise<void> {
    patchState({signedLanguage: language});
    dispatch(ChangeTranslation);
  }

  @Action(SetSpokenLanguageText)
  async setSpokenLanguageText(
    {patchState, getState, dispatch}: StateContext<TranslateStateModel>,
    {text}: SetSpokenLanguageText
  ): Promise<void> {
    const {spokenLanguage} = getState();
    const trimmedText = text.trim();

    patchState({spokenLanguageText: text, normalizedSpokenLanguageText: null});
    const detectLanguage = this.detectLanguage(trimmedText, patchState);

    // Wait for language detection if language is not selected
    if (!spokenLanguage) {
      await detectLanguage;
    }

    dispatch(ChangeTranslation);
  }

  @Action(SuggestAlternativeText, {cancelUncompleted: true})
  suggestAlternativeText({patchState, getState}: StateContext<TranslateStateModel>) {
    const {spokenToSigned, spokenLanguageText, spokenLanguage, detectedLanguage} = getState();
    const trimmedText = spokenLanguageText.trim();
    if (!spokenToSigned || !trimmedText || spokenLanguage !== detectedLanguage) {
      return EMPTY;
    }

    if ('navigator' in globalThis && !navigator.onLine) {
      return EMPTY;
    }

    return this.service.normalizeSpokenLanguageText(spokenLanguage, trimmedText).pipe(
      filter(text => text !== trimmedText),
      tap(text => patchState({normalizedSpokenLanguageText: text}))
    );
  }

  @Action(SetSignedLanguageVideo)
  async setSignedLanguageVideo(
    {patchState}: StateContext<TranslateStateModel>,
    {url}: SetSignedLanguageVideo
  ): Promise<void> {
    patchState({signedLanguageVideo: url});
  }

  @Action(SetSignWritingText)
  async setSignWritingText({patchState}: StateContext<TranslateStateModel>, {text}: SetSignWritingText): Promise<void> {
    // signNormalize only works after the SignWriting font is loaded
    await SignWritingService.loadFonts();
    await SignWritingService.cssLoaded();

    const signWriting: string[] = await Promise.all(
      text.map(sign => {
        const box = sign.startsWith('M') ? sign : 'M500x500' + sign;
        return SignWritingService.normalizeFSW(box);
      })
    );
    patchState({signWriting});
  }

  @Action(ChangeTranslation, {cancelUncompleted: true})
  changeTranslation({getState, patchState, dispatch}: StateContext<TranslateStateModel>): Observable<any> {
    const {spokenToSigned, spokenLanguage, signedLanguage, detectedLanguage, spokenLanguageText} = getState();
    if (spokenToSigned) {
      patchState({signedLanguageVideo: null, signWriting: null}); // reset the signed language translation

      const trimmedSpokenLanguageText = spokenLanguageText.trim();
      if (!trimmedSpokenLanguageText) {
        patchState({signedLanguagePose: null, signWriting: []});
      } else {
        const actualSpokenLanguage = spokenLanguage || detectedLanguage;
        const path = this.service.translateSpokenToSigned(
          trimmedSpokenLanguageText,
          actualSpokenLanguage,
          signedLanguage
        );
        patchState({signedLanguagePose: path});
        return this.swService
          .translateSpokenToSignWriting(trimmedSpokenLanguageText, actualSpokenLanguage, signedLanguage)
          .pipe(tap(({text}) => dispatch(new SetSignWritingText(text.split(' ')))));
      }
    }

    return EMPTY;
  }

  @Action(UploadPoseFile)
  uploadPoseFile({getState, patchState}: StateContext<TranslateStateModel>, {url}: UploadPoseFile): void {
    const {spokenToSigned} = getState();
    if (spokenToSigned) {
      patchState({signedLanguagePose: url, signedLanguageVideo: initialState.signedLanguageVideo});
    }
  }

  @Action(CopySignedLanguageVideo)
  async copySignedLanguageVideo({getState}: StateContext<TranslateStateModel>): Promise<void> {
    const {signedLanguageVideo} = getState();

    const data = await fetch(signedLanguageVideo);
    const blob = await data.blob();
    try {
      const item = new ClipboardItem({[blob.type]: Promise.resolve(blob)});
      await navigator.clipboard.write([item]);
    } catch (e) {
      console.error(e);
      alert(`Copying "${blob.type}" on this device is not supported`);
    }
  }

  async shareNative(file: File) {
    // Save video to file system
    const {Directory, Filesystem} = await import(
      /* webpackChunkName: "@capacitor/filesystem" */ '@capacitor/filesystem'
    );
    const {blobToBase64} = await import(/* webpackChunkName: "base64-blob" */ 'base64-blob');

    const data = await blobToBase64(file);
    const fileOptions = {directory: Directory.Cache, path: 'video.mp4'};
    await Filesystem.writeFile({...fileOptions, data});
    const {uri} = await Filesystem.getUri(fileOptions);

    // Share video
    const {Share} = await import(/* webpackChunkName: "@capacitor/share" */ '@capacitor/share');
    await Share.share({url: uri});
  }

  async shareWeb(file: File) {
    if (!('share' in navigator)) {
      // For example in non-HTTPS on iOS
      alert(`Share functionality is not available`);
      return;
    }

    const files: File[] = [file];

    const url = window.location.href;
    const title = 'Signed Language Video for text';

    if ('canShare' in navigator && (navigator as any).canShare({files})) {
      // Apps like WhatsApp only support sharing a single item
      await navigator.share({files} as ShareData);
    } else {
      // TODO convert the video to GIF, try to share the GIF.
      await navigator.share({text: title, title, url});
    }
  }

  @Action(ShareSignedLanguageVideo)
  async shareSignedLanguageVideo({getState}: StateContext<TranslateStateModel>): Promise<void> {
    const {signedLanguageVideo} = getState();

    const data = await fetch(signedLanguageVideo);
    let blob = await data.blob();
    const ext = blob.type.split('/').pop();

    const file = new File([blob], 'video.' + ext, {type: blob.type});

    if (Capacitor.isNativePlatform()) {
      return this.shareNative(file);
    }

    return this.shareWeb(file);
  }

  @Action(DownloadSignedLanguageVideo)
  async downloadSignedLanguageVideo({getState}: StateContext<TranslateStateModel>): Promise<void> {
    const {signedLanguageVideo, spokenLanguageText} = getState();

    const filename = encodeURIComponent(spokenLanguageText).replaceAll('%20', '-');

    const a = document.createElement('a');
    a.href = signedLanguageVideo;
    a.download = filename;
    document.body.appendChild(a);
    try {
      a.click();
    } catch (e) {
      alert(`Downloading "${filename}" on this device is not supported`);
    }
    document.body.removeChild(a);
  }
}
