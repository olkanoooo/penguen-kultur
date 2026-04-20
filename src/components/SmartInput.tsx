import React, { useState, useEffect, useRef } from 'react';

interface SmartInputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  storageKey: string;
  isTextArea?: boolean;
  transform?: 'uppercase' | 'sentence' | 'title';
}

// Helper functions for Turkish text transformation
const toUpperTR = (str: string) => str.toLocaleUpperCase('tr-TR');
const toSentenceCaseTR = (str: string) => {
  if (!str) return '';
  return str.charAt(0).toLocaleUpperCase('tr-TR') + str.slice(1).toLocaleLowerCase('tr-TR');
};
const toTitleCaseTR = (str: string) => {
  if (!str) return '';
  return str.split(' ').map(word => {
    if (!word) return '';
    return word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1).toLocaleLowerCase('tr-TR');
  }).join(' ');
};

const localStorageKey = (storageKey: string) => `smart_history_${storageKey}`;

export const SmartInput: React.FC<SmartInputProps> = ({ storageKey, className, value, defaultValue, isTextArea, transform, ...props }) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState<string>((value as string) || (defaultValue as string) || '');
  const containerRef = useRef<HTMLDivElement>(null);

  const applyTransform = (val: string) => {
    if (!transform) return val;
    switch (transform) {
      case 'uppercase': return toUpperTR(val);
      case 'sentence': return toSentenceCaseTR(val);
      case 'title': return toTitleCaseTR(val);
      default: return val;
    }
  };

  useEffect(() => {
    const loadHistory = () => {
      try {
        const saved = localStorage.getItem(localStorageKey(storageKey));
        let finalHistory: string[] = [];
        if (saved) {
          try {
            finalHistory = JSON.parse(saved);
            if (!Array.isArray(finalHistory)) finalHistory = [];
          } catch {
            finalHistory = [];
          }
        }

        const cleaned: string[] = [];
        finalHistory.forEach(item => {
          const processedItem = applyTransform(item);
          if (processedItem.includes(',') || processedItem.includes(';')) {
            const parts = processedItem.split(/[;,]+/).map(p => p.trim()).filter(p => p.length >= 2);
            parts.forEach(p => {
              const transformedPart = applyTransform(p);
              if (!cleaned.includes(transformedPart)) cleaned.push(transformedPart);
            });
          } else {
            if (!cleaned.includes(processedItem)) cleaned.push(processedItem);
          }
        });

        setHistory(cleaned.slice(0, 50));
      } catch (e) {
        console.error('Failed to load smart input history:', e);
      }
    };

    loadHistory();
  }, [storageKey, transform]);

  useEffect(() => {
    if (value !== undefined) {
      setInputValue(value as string);
    }
  }, [value]);

  const persistHistory = (newHistory: string[]) => {
    try {
      localStorage.setItem(localStorageKey(storageKey), JSON.stringify(newHistory));
    } catch (e) {
      console.error('Failed to save smart input history:', e);
    }
  };

  const addToHistory = (val: string) => {
    if (!val || val.trim() === '' || val.length < 2) return;

    const parts = val.split(/[;,]+/).map(p => p.trim()).filter(p => p.length >= 2);

    if (parts.length === 0) return;

    let updatedHistory = [...history];
    parts.forEach(part => {
      const transformedPart = applyTransform(part);
      updatedHistory = [transformedPart, ...updatedHistory.filter(h => h !== transformedPart)];
    });

    const newHistory = updatedHistory.slice(0, 50);
    setHistory(newHistory);
    persistHistory(newHistory);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setTimeout(() => {
      setShowSuggestions(false);
      const transformed = applyTransform(inputValue.trim());
      if (transformed) {
        setInputValue(transformed);
        addToHistory(transformed);

        if (props.onChange) {
          const event = {
            target: { ...props, value: transformed, name: props.name },
            currentTarget: { ...props, value: transformed, name: props.name }
          } as any;
          props.onChange(event);
        }
      }
      if (props.onBlur) props.onBlur(e as any);
    }, 200);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (props.onChange) props.onChange(e as any);

    if (val.trim().length > 0) {
      const filtered = history.filter(h =>
        h.toLowerCase().includes(val.toLowerCase()) && h.toLowerCase() !== val.toLowerCase()
      ).sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(val.toLowerCase());
        const bStarts = b.toLowerCase().startsWith(val.toLowerCase());
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.length - b.length;
      });

      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions(history.slice(0, 10));
      setShowSuggestions(history.length > 0);
    }
  };

  const selectSuggestion = (val: string) => {
    const transformed = applyTransform(val);
    setInputValue(transformed);
    if (props.onChange) {
      const event = {
        target: { ...props, value: transformed, name: props.name },
        currentTarget: { ...props, value: transformed, name: props.name }
      } as any;
      props.onChange(event);
    }
    setShowSuggestions(false);
  };

  const InputComponent = isTextArea ? 'textarea' : 'input';

  return (
    <div className="relative w-full" ref={containerRef}>
      <InputComponent
        {...props as any}
        value={inputValue}
        className={className}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={() => {
          if (inputValue.trim().length > 0) {
            const filtered = history.filter(h =>
              h.toLowerCase().includes(inputValue.toLowerCase()) && h.toLowerCase() !== inputValue.toLowerCase()
            );
            setSuggestions(filtered.length > 0 ? filtered : history.slice(0, 10));
            setShowSuggestions(true);
          } else if (history.length > 0) {
            setSuggestions(history.slice(0, 10));
            setShowSuggestions(true);
          }
        }}
        autoComplete="off"
      />
      {showSuggestions && (
        <div className="absolute z-[100] w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 bg-slate-50 border-b border-slate-100">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Öneriler</p>
          </div>
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-5 py-3 text-sm hover:bg-indigo-50 font-bold text-slate-700 transition-colors flex items-center justify-between group"
              onMouseDown={(e) => {
                e.preventDefault();
                selectSuggestion(s);
              }}
            >
              <span>{s}</span>
              <span className="text-[10px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">Seç</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
