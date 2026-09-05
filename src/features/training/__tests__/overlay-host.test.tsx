import { afterEach, expect, jest, test } from '@jest/globals';
import { createRef, useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { BackHandler, Text } from 'react-native';

import {
  OverlayHostProvider,
  useOverlayHost,
  type OverlayHostHandle,
} from '../OverlayHost';

let renderer: ReactTestRenderer;
let overlay: ReturnType<typeof useOverlayHost>;

function Controls() {
  const host = useOverlayHost();
  useEffect(() => {
    overlay = host;
  }, [host]);
  return <Text>Sheet content</Text>;
}

afterEach(() => {
  act(() => renderer?.unmount());
  jest.restoreAllMocks();
});

test('hardware back is handed to the current overlay and released on dismiss', () => {
  const remove = jest.fn();
  let back: Parameters<typeof BackHandler.addEventListener>[1] | undefined;
  const subscribe = jest
    .spyOn(BackHandler, 'addEventListener')
    .mockImplementation((_event, handler) => {
      back = handler;
      return { remove };
    });
  act(() => {
    renderer = create(
      <OverlayHostProvider>
        <Controls />
      </OverlayHostProvider>,
    );
  });
  expect(subscribe).not.toHaveBeenCalled();
  if (overlay.isFallback) throw new Error('Expected a sheet overlay host');
  const host = overlay;
  const onRequestClose = jest.fn(() => host.dismiss());
  act(() => host.present(<Text>Camera</Text>, onRequestClose));
  expect(subscribe).toHaveBeenCalledWith(
    'hardwareBackPress',
    expect.any(Function),
  );
  act(() => {
    expect(back?.({ type: 'hardwareBackPress', timeStamp: 0 })).toBe(true);
  });
  expect(onRequestClose).toHaveBeenCalledTimes(1);
  expect(remove).toHaveBeenCalledTimes(1);
  expect(renderer.root.findAllByType(Text).map((node) => node.props.children))
    .toEqual(['Sheet content']);
});

test('present renders above the sheet at the end of the host; dismiss removes it', () => {
  act(() => {
    renderer = create(
      <OverlayHostProvider>
        <Controls />
      </OverlayHostProvider>,
    );
  });
  if (overlay.isFallback) throw new Error('Expected a sheet overlay host');
  const host = overlay;
  act(() => host.present(<Text>Camera</Text>));
  expect(renderer.root.findAllByType(Text).map((node) => node.props.children))
    .toEqual(['Sheet content', 'Camera']);
  act(() => host.dismiss());
  expect(renderer.root.findAllByType(Text).map((node) => node.props.children))
    .toEqual(['Sheet content']);
});

test('the parent Modal can forward back to the latest overlay and dismiss on sheet close', () => {
  const ref = createRef<OverlayHostHandle>();
  act(() => {
    renderer = create(
      <OverlayHostProvider ref={ref}>
        <Controls />
      </OverlayHostProvider>,
    );
  });
  expect(ref.current?.requestClose()).toBe(false);
  if (overlay.isFallback) throw new Error('Expected a sheet overlay host');
  const host = overlay;
  const cameraClose = jest.fn();
  const playbackClose = jest.fn(() => host.dismiss());
  act(() => host.present(<Text>Camera</Text>, cameraClose));
  act(() => host.present(<Text>Playback</Text>, playbackClose));
  act(() => expect(ref.current?.requestClose()).toBe(true));
  expect(playbackClose).toHaveBeenCalledTimes(1);
  expect(cameraClose).not.toHaveBeenCalled();
  expect(ref.current?.requestClose()).toBe(false);
  act(() => host.present(<Text>Camera</Text>));
  act(() => ref.current?.dismiss());
  expect(renderer.root.findAllByType(Text).map((node) => node.props.children))
    .toEqual(['Sheet content']);
});

test('useOverlayHost signals a top-level Modal fallback outside a provider', () => {
  act(() => {
    renderer = create(<Controls />);
  });
  expect(overlay.isFallback).toBe(true);
});
