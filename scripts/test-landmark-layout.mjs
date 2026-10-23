import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutLandmarks} from '../dist/assets/landmark-layout.js';
import {LANDMARK_CATALOG} from '../dist/assets/landmark-catalog.js';
import {project} from '../dist/assets/projection.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} must equal ${expected}`);
const around = (point, zoom) => ({x: point.x - 500 / zoom, y: point.y - 250 / zoom, width: 1000 / zoom, height: 500 / zoom});
const expand = box => ({x: box.x - 8, y: box.y - 8, width: box.width + 16, height: box.height + 16});
const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
function assertAnchored(item, view, viewport) {
  const anchor = project(item.lat, item.lon);
  const renderScale = Math.min(viewport.width / view.width, viewport.height / view.height);
  const letterboxX = (viewport.width - view.width * renderScale) / 2;
  const letterboxY = (viewport.height - view.height * renderScale) / 2;
  close(item.anchorX, anchor.x);
  close(item.anchorY, anchor.y);
  close(item.x + item.anchorLocalX * item.scale, anchor.x);
  close(item.y + item.anchorLocalY * item.scale, anchor.y);
  close(item.box.x + item.box.width / 2, letterboxX + (anchor.x - view.x) * renderScale);
  close(item.box.y + item.size, letterboxY + (anchor.y - view.y) * renderScale);
  close(item.scale * renderScale, 1);
}

test('a landmark stays at its real bottom-center during zoom, pan and letterboxing', () => {
  const landmark = LANDMARK_CATALOG.find(item => item.id === 'eiffel');
  const anchor = project(landmark.lat, landmark.lon);
  for (const viewport of [{width: 1200, height: 600}, {width: 750, height: 500}, {width: 420, height: 740}]) {
    for (const zoom of [1, 1.25, 1.9, 2, 4, 8, 16]) {
      for (const pan of [0, 18, -18]) {
        const view = around(anchor, zoom);
        view.x += pan / Math.min(viewport.width / view.width, viewport.height / view.height);
        const result = layoutLandmarks([landmark], view, viewport);
        assert.equal(result.length, 1);
        assertAnchored(result[0], view, viewport);
      }
    }
  }
});

test('overlapping neighbors hide by priority instead of seeking offset positions', () => {
  const anchor = project(0, 0);
  const high = {id: 'high', title: 'High', lat: 0, lon: 0, priority: 1, cell: 0};
  const low = {id: 'low', title: 'Low', lat: 0, lon: 0, priority: 2, cell: 1};
  const view = around(anchor, 4), viewport = {width: 1000, height: 500};
  const result = layoutLandmarks([low, high], view, viewport, {ignoreLevels: true});
  assert.deepEqual(result.map(item => item.id), ['high']);
  assertAnchored(result[0], view, viewport);
});

test('more space reveals neighbors while both retain their original coordinates', () => {
  const items = [
    {id: 'west', title: 'West', lat: 0, lon: 0, priority: 1},
    {id: 'east', title: 'East', lat: 0, lon: 10, priority: 1},
  ];
  const focus = project(0, 5), viewport = {width: 1000, height: 500};
  assert.equal(layoutLandmarks(items, around(focus, 1), viewport).length, 1);
  for (const zoom of [6, 8]) {
    const view = around(focus, zoom), result = layoutLandmarks(items, view, viewport);
    assert.equal(result.length, 2);
    result.forEach(item => assertAnchored(item, view, viewport));
    assert.equal(overlaps(expand(result[0].box), expand(result[1].box)), false);
  }
});

test('a control over the fixed image hides it, and never pushes it elsewhere', () => {
  const item = {id: 'blocked', title: 'Blocked', lat: 0, lon: 0, priority: 1};
  const view = around(project(0, 0), 1), viewport = {width: 1000, height: 500};
  assert.equal(layoutLandmarks([item], view, viewport).length, 1);
  assert.equal(layoutLandmarks([item], view, viewport, {obstacles: [{x: 495, y: 200, width: 10, height: 10}]}).length, 0);
});

test('all real catalog landmarks are anchored and collision-free through multiple regional zooms', () => {
  let visible = 0;
  const viewports = [{width: 1200, height: 600}, {width: 720, height: 430}, {width: 390, height: 260}];
  const focuses = [[0, 0], [25, 110], [45, 10], [40, -100], [-25, -55]];
  for (const [lat, lon] of focuses) for (const zoom of [1, 2, 4, 8, 16]) for (const viewport of viewports) {
    const view = around(project(lat, lon), zoom);
    for (const items of [LANDMARK_CATALOG, LANDMARK_CATALOG.map(item => ({...item, title: `A longer English name for ${item.id}`}))]) {
      const result = layoutLandmarks(items, view, viewport, {ignoreLevels: true});
      assert.deepEqual(layoutLandmarks(items, view, viewport, {ignoreLevels: true}), result, 'same view must produce a deterministic layout');
      visible += result.length;
      result.forEach((item, index) => {
        assertAnchored(item, view, viewport);
        const box = expand(item.box);
        assert.ok(box.x >= 10 && box.y >= 10);
        assert.ok(box.x + box.width <= viewport.width - 10 && box.y + box.height <= viewport.height - 10);
        for (const other of result.slice(index + 1)) assert.equal(overlaps(box, expand(other.box)), false);
      });
    }
  }
  assert.ok(visible > 100, 'catalog scenarios must contain enough visible landmarks to exercise collisions');
});

test('offscreen and clipped anchors stay hidden instead of being pulled into the viewport', () => {
  const item = {id: 'edge', title: 'Edge', lat: 0, lon: 0, priority: 1};
  const anchor = project(0, 0), viewport = {width: 1000, height: 500};
  const offscreen = {x: anchor.x + 1, y: anchor.y - 250, width: 1000, height: 500};
  const clipped = {x: anchor.x - 500, y: anchor.y - 40, width: 1000, height: 500};
  assert.deepEqual(layoutLandmarks([item], offscreen, viewport), []);
  assert.deepEqual(layoutLandmarks([item], clipped, viewport), []);
  assert.deepEqual(layoutLandmarks([item], around(anchor, 1), {width: 0, height: 0}), []);
});
