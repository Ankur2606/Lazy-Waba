import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string, provider: 'ollama' | 'nebius') => void;
  ollamaModels: Array<{ name: string }>;
  nebiusModels: Array<{ id: string; name: string }>;
  isLoadingModels: boolean;
  onRefresh: () => void;
  provider: 'ollama' | 'nebius';
  onProviderChange: (provider: 'ollama' | 'nebius') => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export function ModelSelector({
  selectedModel,
  onModelChange,
  ollamaModels,
  nebiusModels,
  isLoadingModels,
  onRefresh,
  provider,
  onProviderChange,
  apiKey,
  onApiKeyChange
}: ModelSelectorProps) {
  useEffect(() => {
    onRefresh();
  }, [onRefresh, provider]);

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <Select value={provider} onValueChange={(value: 'ollama' | 'nebius') => onProviderChange(value)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ollama">Ollama</SelectItem>
            <SelectItem value="nebius">Nebius</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {provider === 'nebius' && (
        <div className="flex items-center gap-2">
          <Label htmlFor="apiKey" className="sr-only">API Key</Label>
          <Input
            id="apiKey"
            type="password"
            placeholder="Nebius API Key"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            className="w-[200px]"
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <Select 
          value={selectedModel} 
          onValueChange={(value) => onModelChange(value, provider)}
          disabled={provider === 'nebius' && !apiKey}
        >
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select Model" />
          </SelectTrigger>
          <SelectContent>
            {provider === 'ollama' ? (
              ollamaModels.map((model) => (
                <SelectItem key={model.name} value={model.name}>
                  {model.name}
                </SelectItem>
              ))
            ) : (
              nebiusModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name || model.id}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={isLoadingModels || (provider === 'nebius' && !apiKey)}
        >
          {isLoadingModels ? (
            <span className="animate-spin">⌛</span>
          ) : (
            <span>🔄</span>
          )}
        </Button>
      </div>
    </div>
  );
} 