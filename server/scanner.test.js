import test from "node:test";
import assert from "node:assert/strict";
import { buildPhotoTags } from "./scanner.js";

test("adds the new-image tag for newly discovered photos", () => {
  assert.equal(buildPhotoTags("", true), "new image");
  assert.equal(buildPhotoTags("travel", true), "travel, new image");
});

test("does not duplicate the new-image tag for photos that already have it", () => {
  assert.equal(buildPhotoTags("new image", true), "new image");
  assert.equal(buildPhotoTags("travel, new image", true), "travel, new image");
});

test("leaves existing tags unchanged for previously known photos", () => {
  assert.equal(buildPhotoTags("travel", false), "travel");
  assert.equal(buildPhotoTags("", false), "");
});
