import MdSettings from '@material-design-icons/svg/round/settings.svg';
import { createSignal, type Accessor } from 'solid-js';
import { createStore } from 'solid-js/store';
import {
  hotkeysMap,
  loadingImgList,
  setDefaultHotkeys,
} from 'components/Manga';
import { toast } from 'components/Toast';
import {
  getKeyboardCode,
  linstenKeydown,
  setInitLang,
  t,
  log,
  createRootMemo,
  createEffectOn,
} from 'helper';

import { useManga } from '../useComponents/Manga';
import { useFab } from '../useComponents/Fab';

import { useSpeedDial } from './useSpeedDial';
import { handleVersionUpdate } from './version';
import { type SiteOptions, useSiteOptions } from './useSiteOptions';

export type LoadImgFn = (setImg: (i: number, url: string) => void) => unknown;

export const [hotkeys, setHotkeys] = createSignal<Record<string, string[]>>({});

/**
 * 对基础的初始化操作的封装
 * @param name 站点名
 * @param defaultOptions 默认配置
 */
export const useInit = async <T extends Record<string, any>>(
  name: string,
  defaultOptions = {} as T,
) => {
  await setInitLang();

  await handleVersionUpdate();

  const { options, setOptions, isStored } = await useSiteOptions(
    name,
    defaultOptions,
  );

  const placement = () =>
    -options.fabPosition.left < window.innerWidth / 2 ? 'left' : 'right';
  const [setFab, fabProps] = await useFab(
    {
      tip: t('other.read_mode'),
      speedDial: useSpeedDial(options, setOptions, placement),
      show: false,
      placement,
      speedDialPlacement: () =>
        -options.fabPosition.top < window.innerHeight / 2 ? 'top' : 'bottom',
    },
    options,
    setOptions,
  );

  setHotkeys(await GM.getValue<Record<string, string[]>>('Hotkeys', {}));
  setDefaultHotkeys((_hotkeys) => ({ ..._hotkeys, enter_read_mode: ['v'] }));

  const [setManga, mangaProps] = await useManga({
    imgList: [],

    option: options.option,
    defaultOption: options.defaultOption,
    onOptionChange: (option) =>
      setOptions({ option } as Partial<T & SiteOptions>),

    hotkeys: hotkeys(),
    onHotkeysChange(newValue: Record<string, string[]>) {
      GM.setValue('Hotkeys', newValue);
      setHotkeys(newValue);
    },
  });

  type Comic = {
    // undefined 表示还未开始加载，空数组表示刚开始加载
    imgList?: string[];
    getImgList: () => Promise<string[]> | string[];
    adList?: Set<number>;
  };

  const [comicMap, setComicMap] = createStore<Record<string | number, Comic>>(
    {},
  );
  const [nowComic, switchComic] = createSignal<string | number>('');

  const setImgList = (id: string | number, i: number, url: string) => {
    // XXX: 之后用 Array.with() 替换
    const newImgList = [...comicMap[id].imgList!];
    newImgList[i] = url;
    setComicMap(id, 'imgList', newImgList);
  };

  const nowImgList = createRootMemo(() => {
    const comic = comicMap[nowComic()];
    if (!comic?.imgList) return undefined;
    if (!comic.adList?.size) return comic.imgList;
    return comic.imgList.filter((_, i) => !comic.adList?.has(i));
  });

  createEffectOn(nowImgList, (list) => list && setManga('imgList', list));

  /** 当前已取得 url 的图片数量 */
  const loadImgNum = createRootMemo(
    () => nowImgList()?.filter(Boolean)?.length,
  );

  // 设置 Fab 的显示进度
  createEffectOn(
    [loadImgNum, () => loadingImgList().size, () => nowImgList()?.length],
    ([doneNum, loadNum, totalNum]) => {
      if (doneNum === undefined || totalNum === undefined)
        return setFab({ progress: undefined });

      if (totalNum === 0)
        return setFab({
          progress: 0,
          tip: `${t('other.loading_img')} - ${doneNum}/${totalNum}`,
        });

      // 加载图片 url 阶段的进度
      if (doneNum < totalNum)
        return setFab({
          progress: doneNum / totalNum,
          tip: `${t('other.loading_img')} - ${doneNum}/${totalNum}`,
        });

      // 图片加载阶段的进度
      if (loadNum < totalNum)
        return setFab({
          progress: 1 + loadNum / totalNum,
          tip: `${t('other.img_loading')} - ${loadNum}/${totalNum}`,
        });

      return setFab({
        progress: 1 + loadNum / totalNum,
        tip: t('other.read_mode'),
        show: !options.hiddenFAB && undefined,
      });
    },
  );

  let menuId: number;
  /** 更新显示/隐藏悬浮按钮的菜单项 */
  const updateHideFabMenu = async () => {
    await GM.unregisterMenuCommand(menuId);
    menuId = await GM.registerMenuCommand(
      options.hiddenFAB ? t('other.fab_show') : t('other.fab_hidden'),
      async () => {
        await setOptions({ ...options, hiddenFAB: !options.hiddenFAB });
        setFab('show', !options.hiddenFAB && undefined);
        await updateHideFabMenu();
      },
    );
  };

  await GM.registerMenuCommand(t('site.show_settings_menu'), () =>
    setFab({
      show: true,
      focus: true,
      tip: t('other.setting'),
      children: <MdSettings />,
      onBackdropClick: () => setFab({ show: false, focus: false }),
    }),
  );

  /** 当前是否还需要判断 autoShow */
  const needAutoShow = { val: true };

  const loadComic = async (id: string | number = nowComic()) => {
    if (!Reflect.has(comicMap, id)) throw new Error('comic not found');

    try {
      setComicMap(id, 'imgList', []);
      const newImgList = await comicMap[id].getImgList();
      if (newImgList.length === 0)
        throw new Error(t('alert.fetch_comic_img_failed'));
      setComicMap(id, 'imgList', newImgList);
    } catch (error) {
      setComicMap(id, 'imgList', undefined);
      log.error(error);
      throw error;
    }
  };

  const showComic = async (id: string | number = nowComic()) => {
    if (!Reflect.has(comicMap, id)) throw new Error('comic not found');
    if (id !== nowComic()) switchComic(id);

    switch (comicMap[id].imgList?.length) {
      case 0:
        return toast.warn(t('alert.repeat_load'), { duration: 1500 });

      case undefined: {
        try {
          await loadComic(id);
          needAutoShow.val = false;
        } catch (error) {
          return toast.error((error as Error).message);
        }
      }
    }
    setManga('show', true);
  };

  const init = () => {
    setFab({ onClick: showComic, show: !options.hiddenFAB && undefined });

    if (needAutoShow.val && options.autoShow) showComic();

    (async () => {
      await GM.registerMenuCommand(t('other.enter_comic_read_mode'), () =>
        fabProps.onClick?.(),
      );
      await updateHideFabMenu();
    })();

    linstenKeydown((e) => {
      const code = getKeyboardCode(e);
      if (hotkeysMap()[code] !== 'enter_read_mode') return;
      e.stopPropagation();
      e.preventDefault();
      fabProps.onClick?.();
    }, true);
  };

  if (isDevMode) Object.assign(unsafeWindow, { comicMap, mangaProps, toast });

  return {
    options,
    setOptions,
    setFab,
    setManga,
    mangaProps,
    fabProps,
    needAutoShow,
    isStored,
    placement,

    comicMap,
    setComicMap,
    setImgList,
    nowComic,
    switchComic,

    showComic,
    loadComic,

    /** 设置对应漫画的加载函数 */
    setComicLoad(
      getImgList: () => Promise<string[]> | string[],
      id: string | number = '',
    ) {
      setComicMap(id, { imgList: undefined, getImgList });
      if (menuId === undefined) return init();
    },

    dynamicLoad:
      (
        loadImgFn: LoadImgFn,
        length: number | Accessor<number>,
        id: string | number = '',
      ) =>
      async () => {
        if (comicMap[id].imgList?.length) return comicMap[id].imgList;

        setComicMap(
          id,
          'imgList',
          Array.from<string>({
            length: typeof length === 'number' ? length : length(),
          }).fill(''),
        );
        // eslint-disable-next-line no-async-promise-executor
        await new Promise(async (resolve) => {
          try {
            await loadImgFn((i, url) => resolve(setImgList(id, i, url)));
          } catch (error) {
            toast.error((error as Error).message);
          }
        });
        return comicMap[id].imgList!;
      },
  };
};
