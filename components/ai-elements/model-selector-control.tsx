"use client";

import {
  ModelSelector,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorInput,
  ModelSelectorList,
  ModelSelectorItem,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorSeparator,
} from "@/components/ai-elements/model-selector";
import { Button } from "@/components/ui/button";
import { CheckIcon, ChevronDownIcon } from "lucide-react";

export type Model = {
  id: string;
  name: string;
  provider: string;
  series: string;
  supportsThinking: boolean;
};

export type ModelSelectorControlProps = {
  models: Model[];
  selectedModel: Model;
  onSelectModel: (model: Model) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ModelSelectorControl({
  models,
  selectedModel,
  onSelectModel,
  isOpen,
  onOpenChange,
}: ModelSelectorControlProps) {
  // Group models by provider
  const googleModels = models.filter((m) => m.provider === "google");
  const groqModels = models.filter((m) => m.provider === "groq");
  const openrouterModels = models.filter((m) => m.provider === "openrouter");
  const cohereModels = models.filter((m) => m.provider === "cohere");

  return (
    <ModelSelector open={isOpen} onOpenChange={onOpenChange}>
      <ModelSelectorTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2 rounded-full border-dashed px-3 bg-background/50 backdrop-blur-sm"
        >
          <ModelSelectorLogo provider={selectedModel.provider} />
          <span className="text-xs font-medium">{selectedModel.name}</span>
          <ChevronDownIcon className="size-3 text-muted-foreground" />
        </Button>
      </ModelSelectorTrigger>
      <ModelSelectorContent 
        side="bottom" 
        align="center" 
        sideOffset={12}
        avoidCollisions={true}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
        }}
      >
        <ModelSelectorInput placeholder="Search models..." />
        <ModelSelectorList>
          <ModelSelectorEmpty>No model found.</ModelSelectorEmpty>
          
          {googleModels.length > 0 && (
            <ModelSelectorGroup heading="Google Gemini">
              {googleModels.map((model) => (
                <ModelSelectorItem
                  key={model.id}
                  onSelect={() => {
                    onSelectModel(model);
                    onOpenChange(false);
                  }}
                  className="gap-2"
                >
                  <ModelSelectorLogo provider={model.provider} />
                  <ModelSelectorName>{model.name}</ModelSelectorName>
                  {selectedModel.id === model.id && (
                    <CheckIcon className="ml-auto size-4" />
                  )}
                </ModelSelectorItem>
              ))}
            </ModelSelectorGroup>
          )}

          {groqModels.length > 0 && (
            <>
              <ModelSelectorSeparator />
              <ModelSelectorGroup heading="Groq">
                {groqModels.map((model) => (
                  <ModelSelectorItem
                    key={model.id}
                    onSelect={() => {
                      onSelectModel(model);
                      onOpenChange(false);
                    }}
                    className="gap-2"
                  >
                    <ModelSelectorLogo provider={model.provider} />
                    <ModelSelectorName>{model.name}</ModelSelectorName>
                    {selectedModel.id === model.id && (
                      <CheckIcon className="ml-auto size-4" />
                    )}
                  </ModelSelectorItem>
                ))}
              </ModelSelectorGroup>
            </>
          )}

          {openrouterModels.length > 0 && (
            <>
              <ModelSelectorSeparator />
              <ModelSelectorGroup heading="OpenRouter">
                {openrouterModels.map((model) => (
                  <ModelSelectorItem
                    key={model.id}
                    onSelect={() => {
                      onSelectModel(model);
                      onOpenChange(false);
                    }}
                    className="gap-2"
                  >
                    <ModelSelectorLogo provider={model.provider} />
                    <ModelSelectorName>{model.name}</ModelSelectorName>
                    {selectedModel.id === model.id && (
                      <CheckIcon className="ml-auto size-4" />
                    )}
                  </ModelSelectorItem>
                ))}
              </ModelSelectorGroup>
            </>
          )}

          {cohereModels.length > 0 && (
            <>
              <ModelSelectorSeparator />
              <ModelSelectorGroup heading="Cohere">
                {cohereModels.map((model) => (
                  <ModelSelectorItem
                    key={model.id}
                    onSelect={() => {
                      onSelectModel(model);
                      onOpenChange(false);
                    }}
                    className="gap-2"
                  >
                    <ModelSelectorLogo provider={model.provider} />
                    <ModelSelectorName>{model.name}</ModelSelectorName>
                    {selectedModel.id === model.id && (
                      <CheckIcon className="ml-auto size-4" />
                    )}
                  </ModelSelectorItem>
                ))}
              </ModelSelectorGroup>
            </>
          )}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
}
