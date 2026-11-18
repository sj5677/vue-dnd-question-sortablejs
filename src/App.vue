<template>
  <main>
    <h3>{{ question.title }}</h3>
    <p>
      Match the empty boxes in the image with the options by selecting the empty box and the
      correct option, or drag an option onto a box.
    </p>

    <p class="layout-toggle">
      Layout:
      <label><input v-model="layout" type="radio" value="side" /> Side by side</label>
      <label><input v-model="layout" type="radio" value="stack" /> Top down</label>
    </p>

    <div class="layout" :class="layout">
      <div class="stage">
        <img :src="'/' + question.fileName" @load="onBgLoad" />
        <template v-if="bg">
          <div
            v-for="(a, i) in answers"
            :key="i"
            v-sortable
            class="zone"
            :class="{ selected: selected?.zone === i }"
            :data-zone="i"
            :style="zoneStyle(a)"
            @click="clickZone(i)"
          >
            <div v-if="a.dropTargetId" class="option placed" :data-id="a.dropTargetId">
              <OptionBody :option="optionsById[a.dropTargetId]" />
            </div>
          </div>
        </template>
      </div>

      <div v-sortable="'clone'" class="pool">
        <div
          v-for="o in question.questionOptions"
          :key="o.id"
          class="option"
          :class="{ selected: selected?.option === o.id, added: isAdded(o.id) }"
          :data-id="o.id"
          :style="{ width: o.answer.width + 'px', aspectRatio: o.answer.width + ' / ' + o.answer.height }"
          @click="clickOption(o.id)"
        >
          <OptionBody :option="o" />
        </div>
      </div>
    </div>

    <h4>Answer payload</h4>
    <pre>{{ answers }}</pre>
  </main>
</template>

<script setup>
import { h, ref } from "vue";
import Sortable from "sortablejs";
import question from "./question.js";

const OptionBody = ({ option }) =>
  option.fileName ? h("img", { src: "/" + option.fileName }) : h("span", option.answer.textValue);

const optionsById = Object.fromEntries(question.questionOptions.map((o) => [o.id, o]));

// Drop zones = answer options minus textValue, same as backend QuestionSerializer.populateOptionOrientation.
// One answer entry per zone, same shape DragDropAttempt emits: { xCoordinate, yCoordinate, width, height, dropTargetId? }.
const answers = ref(
  question.questionOptions.filter((o) => o.isAnswer).map(({ answer: { textValue, ...zone } }) => zone),
);
const selected = ref(null); // { option: id } | { zone: index }
const bg = ref(null);
const layout = ref("side"); // "side" | "stack"

const onBgLoad = (e) => (bg.value = { w: e.target.naturalWidth, h: e.target.naturalHeight });
const pct = (v, total) => `${(v / total) * 100}%`;
const zoneStyle = (a) => ({
  left: pct(a.xCoordinate, bg.value.w),
  top: pct(a.yCoordinate, bg.value.h),
  width: pct(a.width, bg.value.w),
  height: pct(a.height, bg.value.h),
});
const isAdded = (id) => answers.value.some((a) => a.dropTargetId === id);

function place(id, zone) {
  answers.value.forEach((a) => {
    if (a.dropTargetId === id) delete a.dropTargetId;
  });
  answers.value[zone].dropTargetId = id;
}

function remove(zone) {
  delete answers.value[zone].dropTargetId;
}

function swap(from, to) {
  const a = answers.value;
  [a[from].dropTargetId, a[to].dropTargetId] = [a[to].dropTargetId, a[from].dropTargetId];
}

// Click-and-drop: pick an option then a box, or a box then an option.
function clickOption(id) {
  const zone = selected.value?.zone;
  if (zone === undefined) {
    selected.value = selected.value?.option === id ? null : { option: id };
    return;
  }
  // Clicking the option already in the selected box takes it out (as in DragDropTarget).
  if (answers.value[zone].dropTargetId === id) remove(zone);
  else place(id, zone);
  selected.value = null;
}

function clickZone(zone) {
  const id = selected.value?.option;
  if (id === undefined) {
    selected.value = selected.value?.zone === zone ? null : { zone };
    return;
  }
  place(id, zone);
  selected.value = null;
}

// Drag-and-drop: Sortable moves real DOM nodes, so undo its move and let Vue re-render from state.
function onEnd({ item, from, to, clone }) {
  if (from === to) return;
  if (clone?.isConnected) clone.replaceWith(item);
  else from.append(item);

  if (to.dataset.zone === undefined) remove(Number(from.dataset.zone));
  // Box to box: swap, so the box's previous option moves to the source box instead of the pool.
  else if (from.dataset.zone !== undefined) swap(Number(from.dataset.zone), Number(to.dataset.zone));
  else place(item.dataset.id, Number(to.dataset.zone));
  selected.value = null;
}

// Pool uses pull "clone" so options stay listed after being placed (same as the attempt accordion).
const vSortable = {
  mounted: (el, { value: pull = true }) =>
    Sortable.create(el, { group: { name: "dnd", pull }, sort: false, onEnd }),
};
</script>

<style>
main {
  font-family: sans-serif;
  max-width: 1100px;
  margin: 1rem auto;
  padding: 0 1rem;
}
.layout-toggle label {
  margin-left: 0.75rem;
}
.layout {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}
.layout.stack {
  flex-direction: column;
}
.stage {
  position: relative;
  min-width: 0;
}
.stage > img {
  display: block;
  max-width: 100%;
}
.zone {
  position: absolute;
  background: #fff;
  outline: 1px solid #0f62fe;
  cursor: pointer;
}
.zone.selected,
.option.selected {
  outline: 3px solid #0f62fe;
}
/* !important: a pool option hovering a zone mid-drag still carries its inline pool size */
.zone > .option {
  width: 100% !important;
  height: 100% !important;
}
/* Sortable's drag preview (ghost) overlays the box instead of stacking under its current option */
.zone > .sortable-ghost {
  position: absolute;
  inset: 0;
}
/* A placed option dragged back over the pool: hide the preview, the pool already lists it */
.pool > .placed.sortable-ghost {
  display: none;
}
.pool {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
/* Side by side: option list takes at most 30% of the width, options scale down to fit */
.layout.side .pool {
  flex: none;
  max-width: 30%;
}
.layout.stack .pool {
  flex-direction: row;
  flex-wrap: wrap;
}
.pool > .option {
  max-width: 100%;
}
.option {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  background: #fff;
  border: 1px solid #c6c6c6;
  cursor: grab;
}
.option.added {
  opacity: 0.5;
}
.option img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
