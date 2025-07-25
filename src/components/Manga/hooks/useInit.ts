import { createEffect, on } from 'solid-js';
import {
  assign,
  debounce,
  throttle,
  createEffectOn,
  createRootMemo,
} from 'helper';

import { type MangaProps } from '..';
import { type State, _setState, refs, setState } from '../store';
import {
  defaultHotkeys,
  focus,
  watchDomSize,
  resetImgState,
  scrollTo,
  updatePageData,
  updateShowRange,
  placeholderSize,
  resumeReadProgress,
  updateSelfhostedOptions,
} from '../actions';
import { defaultOption, type Option } from '../store/option';
import { playAnimation, stopPropagation } from '../helper';
import classes from '../index.module.css';

const createComicImg = (src: string): ComicImg => ({
  src,
  loadType: 'wait',
  size: placeholderSize(),
  blobUrl: src.startsWith('blob:') ? src : undefined,
});

export const useInit = (props: MangaProps) => {
  watchDomSize('rootSize', refs.root);

  const updateOption = (state: State) => {
    state.option = props.option
      ? assign(state.defaultOption, props.option as Partial<Option>)
      : state.defaultOption;
  };

  const bindDebounce = (key: keyof MangaProps) => (state: State) => {
    state.prop[key] = props[key] ? debounce(props[key] as any) : undefined;
  };

  const watchProps: Partial<
    Record<keyof MangaProps, (state: State) => unknown>
  > = {
    option: updateOption,
    onLoading: bindDebounce('onLoading'),
    onOptionChange: bindDebounce('onOptionChange'),
    onHotkeysChange: bindDebounce('onHotkeysChange'),
    onShowImgsChange: bindDebounce('onShowImgsChange'),

    defaultOption(state) {
      state.defaultOption = assign(
        defaultOption(),
        props.defaultOption as Partial<Option>,
      );
      updateOption(state);
    },
    fillEffect(state) {
      state.fillEffect = props.fillEffect ?? { '-1': true };
      updatePageData(state);
    },

    onExit(state) {
      state.prop.onExit = (isEnd?: boolean | Event) => {
        playAnimation(refs.exit);
        props.onExit?.(Boolean(isEnd));
        setState((draftState) => {
          if (isEnd) draftState.activePageIndex = 0;
          draftState.show.endPage = undefined;
        });
        if (document.fullscreenElement) document.exitFullscreen();
      };
    },
    onPrev(state) {
      state.prop.onPrev = props.onPrev
        ? throttle(() => {
            playAnimation(refs.prev);
            props.onPrev?.();
          }, 1000)
        : undefined;
    },
    onNext(state) {
      state.prop.onNext = props.onNext
        ? throttle(() => {
            playAnimation(refs.next);
            props.onNext?.();
          }, 1000)
        : undefined;
    },
    onImgError(state) {
      state.prop.onImgError = props.onImgError;
    },
    editButtonList(state) {
      state.prop.editButtonList = props.editButtonList ?? ((list) => list);
    },
    editSettingList(state) {
      state.prop.editSettingList = props.editSettingList ?? ((list) => list);
    },
    commentList(state) {
      state.commentList = props.commentList;
    },
    title(state) {
      state.title = props.title ?? '';
    },
  };
  for (const [key, fn] of Object.entries(watchProps)) {
    createEffect(
      on(
        () => props[key as keyof MangaProps],
        () => setState(fn),
      ),
    );
  }

  createEffect(() => {
    setState((state) => {
      state.hotkeys = {
        ...JSON.parse(JSON.stringify(defaultHotkeys())),
        ...props.hotkeys,
      };
    });
  });

  const handleImgList = () => {
    setState((state) => {
      // 使用相对协议路径，防止 Mixed Content 报错
      const imgList = props.imgList.map((url) => url?.replace(/^http:/, ''));

      /** 修改前的当前显示图片 */
      const oldActiveImg =
        state.pageList[state.activePageIndex]?.map((i) => state.imgList?.[i]) ??
        [];

      /** 是否需要重置页面填充 */
      let needResetFillEffect = false;
      const fillEffectList = Object.keys(state.fillEffect).map(Number);
      for (const pageIndex of fillEffectList) {
        if (pageIndex === -1) continue;
        if (state.imgList[pageIndex] === imgList[pageIndex]) continue;
        needResetFillEffect = true;
        break;
      }

      const newImgList = new Set(imgList);
      const oldImgList = new Set(state.imgList);

      if (oldImgList.size === 0 && newImgList.size > 0) {
        resumeReadProgress(state);
        updateSelfhostedOptions(true);
      }

      /** 被删除的图片 */
      const deleteList = [...oldImgList].filter((url) => !newImgList.has(url));
      for (const url of deleteList)
        if (state.imgMap[url].blobUrl && state.imgMap[url].blobUrl !== url)
          URL.revokeObjectURL(state.imgMap[url].blobUrl);

      /** 删除图片数 */
      const deleteNum = deleteList.length;

      /** 传入的是否是新漫画 */
      const isNew = deleteNum >= oldImgList.size * 0.8; // 删掉8成图就算是新漫画

      /** 是否需要更新页面 */
      const needUpdatePageData =
        needResetFillEffect ||
        state.imgList.length !== imgList.length ||
        deleteNum > 0;

      const newImgMap: State['imgMap'] = {};
      for (const url of imgList)
        newImgMap[url] = state.imgMap[url] ?? createComicImg(url);

      state.imgMap = newImgMap;
      state.imgList = imgList;

      state.prop.onLoading?.(state.imgList.map((url) => state.imgMap[url]));

      if (isNew) state.show.endPage = undefined;

      if (isNew || needResetFillEffect)
        state.fillEffect = props.fillEffect ?? { '-1': true };

      if (isNew || needUpdatePageData) {
        updatePageData(state);

        // 当前位于最后一页时最后一页被删的处理
        if (state.activePageIndex >= state.pageList.length)
          state.activePageIndex = state.pageList.length - 1;
        updateShowRange(state);
      }

      if (isNew || state.pageList.length === 0) {
        resetImgState(state);
        state.activePageIndex = 0;
        scrollTo(0);
        return;
      }

      // 尽量使当前显示的图片在修改后依然不变
      oldActiveImg.some((url) => {
        // 跳过填充页和已被删除的图片
        if (!url || imgList.includes(url)) return false;

        const newPageIndex = state.pageList.findIndex((page) =>
          page.some((index) => state.imgList?.[index] === url),
        );
        if (newPageIndex === -1) return false;

        state.activePageIndex = newPageIndex;
        return true;
      });

      // 如果已经翻到了最后一页，且最后一页的图片被删掉了，那就保持在末页显示
      if (state.activePageIndex > state.pageList.length - 1)
        state.activePageIndex = state.pageList.length - 1;
    });
  };

  // 处理 imgList 参数的初始化和修改
  createEffectOn(
    createRootMemo(() => props.imgList),
    throttle(handleImgList, 500),
  );

  // 通过手动创建一个 Worker 来检测是否支持 Worker，避免因为 CSP 限制而出错
  setTimeout(() => {
    const codeUrl = URL.createObjectURL(
      new Blob(['self.close();'], { type: 'text/javascript' }),
    );
    setTimeout(URL.revokeObjectURL, 0, codeUrl);
    _setState('supportWorker', Boolean(new Worker(codeUrl)));
  }, 0);

  // 更新 fullscreen 参数
  refs.root.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) return _setState('fullscreen', false);
    if (
      document.fullscreenElement.id === 'comicRead' ||
      document.fullscreenElement.classList.contains(classes.root)
    )
      _setState('fullscreen', true);
  });

  for (const eventName of [
    'keypress',
    'keyup',
    'touchstart',
    'touchmove',
    'touchend',
  ] as Array<keyof HTMLElementEventMap>)
    refs.root.addEventListener(eventName, stopPropagation, { capture: true });

  focus();
};
