<template>
  <div class="embeddingConfig">
    <t-alert theme="warning" class="topAlert" :message="$t('settings.memory.embedding.warning')" />

    <t-form :data="formData" labelAlign="top" labelWidth="180px" class="embeddingForm" @submit="handleSave">
      <t-card :title="$t('settings.memory.embedding.apiConfig')" :bordered="true" style="margin-top: 16px">
        <t-form-item :label="$t('settings.memory.embedding.apiUrl')" name="embeddingApiUrl">
          <t-input v-model="formData.embeddingApiUrl" clearable />
          <template #help>{{ $t("settings.memory.embedding.apiUrlHelp") }}</template>
        </t-form-item>
        <t-form-item :label="$t('settings.memory.embedding.apiKey')" name="embeddingApiKey">
          <t-input v-model="formData.embeddingApiKey" type="password" clearable />
        </t-form-item>
        <t-form-item :label="$t('settings.memory.embedding.model')" name="embeddingModel">
          <t-input v-model="formData.embeddingModel" clearable />
          <template #help>{{ $t("settings.memory.embedding.modelHelp") }}</template>
        </t-form-item>
      </t-card>

      <div class="actionRow f frr">
        <t-button theme="primary" type="submit" :loading="saving">{{ $t("settings.memory.embedding.saveConfig") }}</t-button>
        <t-button theme="warning" variant="outline" type="button" :loading="saving" @click="handleRestore">{{ $t("settings.memory.embedding.restoreDefault") }}</t-button>
      </div>
    </t-form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import axios from "@/utils/axios";

interface EmbeddingConfigForm {
  embeddingApiUrl: string;
  embeddingApiKey: string;
  embeddingModel: string;
}

const defaults: EmbeddingConfigForm = {
  embeddingApiUrl: "https://api.openai.com/v1/embeddings",
  embeddingApiKey: "",
  embeddingModel: "text-embedding-3-small",
};

const formData = ref<EmbeddingConfigForm>({ ...defaults });
const loading = ref(false);
const saving = ref(false);

async function getEmbeddingConfig() {
  loading.value = true;
  try {
    const { data } = await axios.get("/setting/embeddingConfig/getEmbeddingConfig");
    formData.value = {
      embeddingApiUrl: data.embeddingApiUrl ?? defaults.embeddingApiUrl,
      embeddingApiKey: data.embeddingApiKey ?? defaults.embeddingApiKey,
      embeddingModel: data.embeddingModel ?? defaults.embeddingModel,
    };
  } catch (error: any) {
    window.$message.warning(error?.message);
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  saving.value = true;
  try {
    await axios.post("/setting/embeddingConfig/saveEmbeddingConfig", {
      ...formData.value,
    });
    window.$message.success($t("settings.memory.embedding.msg.saved"));
  } catch (error: any) {
    window.$message.warning(error?.message);
  } finally {
    saving.value = false;
  }
}

function handleRestore() {
  formData.value = { ...defaults };
  handleSave();
}

onMounted(() => {
  getEmbeddingConfig();
});
</script>

<style lang="scss" scoped>
.embeddingConfig {
  .topAlert {
    margin-bottom: 16px;
  }

  .embeddingForm {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .actionRow {
    & > * {
      margin-left: 16px;
    }
  }
}
</style>
