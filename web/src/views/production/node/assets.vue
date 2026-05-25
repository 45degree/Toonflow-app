<template>
  <t-card class="assets">
    <Handle :id="props.handleIds.target" type="target" :position="Position.Top" />
    <div class="titleBar dragHandle">
      <div class="title">{{ $t("workbench.production.node.assets.title") }}</div>
    </div>
    <div class="content">
      <div class="cardGrid">
        <div v-for="(asset, pi) in assets" :key="asset.id" class="assetItemBox">
          <t-card class="assetCard">
            <div v-if="asset.src" class="assetImageWrap">
              <t-image :src="asset.src" fit="contain" class="assetImage" :preview="true">
                <template #overlayContent>
                  <div class="imageToolsWrap show">
                    <ImageTools :src="asset.src" position="br" :show-delete="!!asset.id" @delete="handleDeleteParentImage(pi)" />
                  </div>
                </template>
              </t-image>
              <t-tooltip theme="primary" :content="$t('workbench.production.node.assets.uploadImage')">
                <div class="uploadBtn ac" @click.stop="triggerParentUpload(pi)">
                  <i-upload theme="outline" size="14" fill="#fff" />
                </div>
              </t-tooltip>
            </div>
            <div v-else class="assetImageWrap assetImagePlaceholder">
              <t-loading v-if="asset.state == '生成中'" size="small" />
              <span v-else-if="asset.state == '生成失败'" style="color: red">{{ $t("workbench.production.node.assets.generateFailed") }}</span>
              <t-empty v-else size="small" :title="$t('workbench.production.node.assets.notGenerated')" />
              <t-tooltip theme="primary" :content="$t('workbench.production.node.assets.uploadImage')">
                <div class="uploadBtn ac" @click.stop="triggerParentUpload(pi)">
                  <i-upload theme="outline" size="14" fill="#fff" />
                </div>
              </t-tooltip>
            </div>
            <input :ref="(el: any) => setParentUploadRef(el, pi)" type="file" accept="image/*" style="display:none" @change="(e: Event) => handleParentImageUpload(e, pi)" />
            <div class="cardInfo">
              <div class="cardName">
                <span class="nameText">{{ asset.name }}</span>
                <t-tag theme="success">{{ $t("workbench.production.node.assets.originalAsset") }}</t-tag>
              </div>
              <div class="cardDesc">{{ asset.desc }}</div>
            </div>
          </t-card>
          <div class="divider">
            <i-right size="32"></i-right>
          </div>
          <div class="deriveAssets">
            <t-card v-for="(item, di) in asset.derive" :key="di" class="assetCard" @click="generateAssetsImage(item, asset.src)">
              <div v-if="item.src && item.state == '已完成'" class="assetImageWrap">
                <t-image :src="item.src" fit="contain" class="assetImage" :preview="true">
                  <template #overlayContent>
                    <div class="imageToolsWrap show">
                      <ImageTools :src="item.src" position="br" :show-delete="!!item.id" @delete="handleDeleteDeriveImage(pi, di)" />
                    </div>
                  </template>
                </t-image>
              </div>
              <div v-else class="assetImageWrap assetImagePlaceholder">
                <t-loading v-if="item.state == '生成中'" size="small" />
                <t-tooltip v-else-if="item.state == '生成失败'" :content="item?.errorReason">
                  <div style="color: red; cursor: pointer">{{ $t("workbench.novel.genFailed") }}</div>
                </t-tooltip>
                <t-empty v-else size="small" :title="$t('workbench.production.node.assets.notGenerated')" />
              </div>
              <div class="cardActions">
                <t-tooltip theme="primary" :content="$t('workbench.production.node.assets.uploadImage')">
                  <div class="uploadBtn ac" @click.stop="triggerDeriveUpload(pi, di)">
                    <i-upload theme="outline" size="14" fill="#fff" />
                  </div>
                </t-tooltip>
                <t-tooltip theme="primary" :content="$t('workbench.production.node.storyboard.deleteNode')">
                  <div class="remove ac" @click.stop="removeFn(item.id!)">
                    <i-delete theme="outline" size="18" fill="#fff" />
                  </div>
                </t-tooltip>
              </div>
              <input :ref="(el: any) => setDeriveUploadRef(el, pi, di)" type="file" accept="image/*" style="display:none" @change="(e: Event) => handleDeriveImageUpload(e, pi, di)" />
              <div class="cardInfo">
                <div class="cardName">
                  <span class="nameText">{{ item.name }}</span>
                  <t-tag theme="warning">{{ $t("workbench.production.node.assets.derived") }}</t-tag>
                </div>
                <div class="cardDesc">{{ item.desc }}</div>
              </div>
            </t-card>
            <t-card v-if="asset.derive.length <= 0" class="assetCard emptyCard">
              <t-empty :title="$t('workbench.production.node.assets.noDerivedAssets')"></t-empty>
            </t-card>
          </div>
        </div>
      </div>
    </div>
    <editImage v-model="visible" v-if="visible" :flowData="currentRow" @save="save" />
  </t-card>
</template>

<script setup lang="ts">
import { Handle, Position, type Edge } from "@vue-flow/core";
import editImage from "../components/editImage/index.vue";
import { type AssetItem, type DeriveAsset } from "../utils/flowBuilder";
import axios from "@/utils/axios";
import useProjectStore from "@/stores/project";
const { project } = storeToRefs(useProjectStore());
const props = defineProps<{
  id: string;
  handleIds: {
    target: string;
  };
}>();

const assets = defineModel<AssetItem[]>({ required: true });
const currentRow = ref<{
  flowId?: number;
  resultImages: { src: string; prompt: string }[];
  referanceImages: string[];
}>({
  resultImages: [],
  referanceImages: [],
});
const visible = ref(false);
const currentAssetsId = ref();
function generateAssetsImage(row: DeriveAsset, referanceImageUrl: string) {
  currentRow.value = {
    flowId: row?.flowId,
    resultImages: [{ src: row.src, prompt: row.prompt }],
    referanceImages: [referanceImageUrl],
  };
  currentAssetsId.value = row.id;
  visible.value = true;
}

async function save({ imageUrl, flowId }: { imageUrl: string; flowId: number }) {
  // 更新对应分镜的 src
  if (!imageUrl) return;
  for (const i of assets.value) {
    const target = i.derive.find((s) => s.id === currentAssetsId.value);
    if (target) {
      target.state = '已完成'
      target.src = imageUrl;
      target.flowId = flowId;
      break;
    }
  }

  await axios.post("/production/assets/updateAssetsUrl", {
    id: currentAssetsId.value,
    url: imageUrl,
    flowId,
  });
}

async function removeFn(id: number) {
  const dialog = DialogPlugin.confirm({
    header: $t("workbench.assets.confirmDeleteHeader"),
    body: $t("workbench.production.node.assets.confirmDeleteBody"),
    confirmBtn: $t("workbench.assets.deleteBtn"),
    cancelBtn: $t("workbench.assets.cancelBtn"),
    theme: "warning",
    onConfirm: async () => {
      try {
        await axios.post("/production/assets/deleteAssetsDireve", {
          id,
          projectId: project.value?.id,
        });
        //找到对应子资产删除
        assets.value.forEach((item) => {
          const targetIndex = item.derive.findIndex((s) => s.id === id);
          if (targetIndex !== -1) {
            item.derive.splice(targetIndex, 1);
          }
        });
      } catch (e) {
        window.$message.error((e as any)?.message || $t("workbench.production.node.assets.removeFailed"));
      } finally {
        dialog.destroy();
      }
    },
  });
}

const parentUploadRefs = ref<Record<number, HTMLInputElement | null>>({});
const deriveUploadRefs = ref<Record<string, HTMLInputElement | null>>({});

function setParentUploadRef(el: any, pi: number) {
  if (el) parentUploadRefs.value[pi] = el as HTMLInputElement;
}
function setDeriveUploadRef(el: any, pi: number, di: number) {
  if (el) deriveUploadRefs.value[`${pi}_${di}`] = el as HTMLInputElement;
}

function triggerParentUpload(pi: number) {
  parentUploadRefs.value[pi]?.click();
}
function triggerDeriveUpload(pi: number, di: number) {
  deriveUploadRefs.value[`${pi}_${di}`]?.click();
}

async function handleParentImageUpload(event: Event, pi: number) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  const asset = assets.value[pi];
  if (!file || !asset) return;
  try {
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
    const { data } = await axios.post("/assets/saveAssets", {
      id: asset.id,
      projectId: project.value?.id,
      type: asset.type,
      base64,
    });
    asset.src = data.imageUrl || "";
    asset.state = "已完成";
    asset.imageId = data.imageId;
    window.$message.success($t("workbench.production.node.assets.uploadSuccess"));
  } catch {
    window.$message.error($t("workbench.production.node.assets.uploadFailed"));
  } finally {
    input.value = "";
  }
}

async function handleDeriveImageUpload(event: Event, pi: number, di: number) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  const derive = assets.value[pi]?.derive[di];
  if (!file || !derive) return;
  try {
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
    const { data } = await axios.post("/assets/saveAssets", {
      id: derive.id,
      projectId: project.value?.id,
      type: derive.type,
      base64,
    });
    derive.src = data.imageUrl || "";
    derive.state = "已完成";
    derive.imageId = data.imageId;
    window.$message.success($t("workbench.production.node.assets.uploadSuccess"));
  } catch {
    window.$message.error($t("workbench.production.node.assets.uploadFailed"));
  } finally {
    input.value = "";
  }
}

async function handleDeleteParentImage(pi: number) {
  const asset = assets.value[pi];
  if (!asset?.imageId) return;
  const dialog = DialogPlugin.confirm({
    header: $t("workbench.production.node.assets.deleteImage"),
    body: $t("workbench.production.node.assets.confirmDeleteImage"),
    theme: "warning",
    confirmBtn: $t("workbench.assets.sure"),
    cancelBtn: $t("workbench.assets.cancelBtn"),
    onConfirm: async () => {
      try {
        await axios.post("/assets/delImage", { id: asset.imageId });
        asset.src = "";
        asset.state = "未生成";
        asset.imageId = undefined;
        window.$message.success($t("workbench.production.node.assets.deleteSuccess"));
      } catch {
        window.$message.error($t("workbench.production.node.assets.deleteFailed"));
      } finally {
        dialog.destroy();
      }
    },
  });
}

async function handleDeleteDeriveImage(pi: number, di: number) {
  const derive = assets.value[pi]?.derive[di];
  if (!derive?.imageId) return;
  const dialog = DialogPlugin.confirm({
    header: $t("workbench.production.node.assets.deleteImage"),
    body: $t("workbench.production.node.assets.confirmDeleteImage"),
    theme: "warning",
    confirmBtn: $t("workbench.assets.sure"),
    cancelBtn: $t("workbench.assets.cancelBtn"),
    onConfirm: async () => {
      try {
        await axios.post("/assets/delImage", { id: derive.imageId });
        derive.src = "";
        derive.state = "未生成";
        derive.imageId = undefined;
        window.$message.success($t("workbench.production.node.assets.deleteSuccess"));
      } catch {
        window.$message.error($t("workbench.production.node.assets.deleteFailed"));
      } finally {
        dialog.destroy();
      }
    },
  });
}
</script>

<style lang="scss" scoped>
.assets {
  width: fit-content;
  user-select: text;
  cursor: default;

  .titleBar {
    cursor: grab;
    user-select: none;

    .title {
      background-color: #000;
      width: fit-content;
      padding: 5px 10px;
      color: #fff;
      border-radius: 8px 0;
      font-size: 16px;
    }
  }

  .content {
    margin-top: 8px;

    .cardGrid {
      display: flex;
      flex-direction: column;

      .assetItemBox {
        display: flex;
        align-items: stretch;
        gap: 12px;
        padding: 10px;
        content-visibility: auto;
        contain-intrinsic-size: auto 250px;

        &:not(:first-child) {
          margin-top: 8px;
        }

        .assetCard {
          width: 200px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          &:hover {
            .remove {
              opacity: 1;
            }
            .uploadBtn {
              opacity: 1;
            }
            .cardActions {
              opacity: 1;
            }
          }
          .assetImageWrap {
            width: 100%;
            aspect-ratio: 1 / 1;
            position: relative;

            &.assetImagePlaceholder {
              display: flex;
              align-items: center;
              justify-content: center;
              background-color: var(--td-bg-color-container-hover, #f5f5f5);
              border-radius: 4px;
              overflow: hidden;
            }

            .uploadBtn {
              position: absolute;
              top: 3px;
              right: 3px;
              z-index: 10;
              padding: 5px;
              border-radius: 10px;
              background-color: rgba(0, 123, 255, 0.7);
              cursor: pointer;
              opacity: 0;
              &:hover {
                background-color: rgba(0, 123, 255, 1);
              }
            }

            .assetImage {
              height: 100%;
              border-radius: 4px;

              .imageToolsWrap {
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.2s ease;
              }

              &:hover .imageToolsWrap {
                opacity: 1;
                pointer-events: auto;
              }
            }
          }

          .cardInfo {
            margin-top: 8px;

            .cardName {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 13px;
              font-weight: 600;
              color: #333;

              .nameText {
                text-overflow: ellipsis;
                white-space: nowrap;
                overflow: hidden;
                max-width: 120px;
              }
            }

            .cardDesc {
              font-size: 11px;
              color: #999;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }
          }
        }

        .divider {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        .deriveAssets {
          display: flex;
          align-items: stretch;
          gap: 12px;

          .cardActions {
            position: absolute;
            top: 3px;
            right: 3px;
            z-index: 9999;
            display: flex;
            gap: 4px;
            opacity: 0;
          }
          .uploadBtn {
            padding: 5px;
            border-radius: 10px;
            background-color: rgba(0, 123, 255, 0.7);
            cursor: pointer;
            &:hover {
              background-color: rgba(0, 123, 255, 1);
            }
          }
          .remove {
            padding: 5px;
            border-radius: 10px;
            background-color: rgba(220, 50, 50, 0.7);
            cursor: pointer;
            &:hover {
              background-color: rgba(220, 50, 50, 1);
            }
          }
          .emptyCard {
            display: flex;
            align-items: center;
            justify-content: center;

            :deep(.t-card__body) {
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
            }
          }
        }
      }
    }
  }
}
</style>
