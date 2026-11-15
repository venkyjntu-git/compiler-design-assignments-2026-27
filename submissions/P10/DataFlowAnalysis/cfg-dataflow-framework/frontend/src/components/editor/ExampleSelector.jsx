import React from 'react';
import { Bookmark, ChevronDown } from 'lucide-react';

export default function ExampleSelector({
  samples,
  selectedSampleId,
  onSelectSample
}) {
  return (
    <div className="example-selector-container">
      <div className="example-selector-label">
        <Bookmark size={13} className="example-icon" />
        <span>Benchmark:</span>
      </div>
      <div className="example-select-wrapper">
        <select
          id="sample-selector-dropdown"
          className="example-dropdown"
          value={selectedSampleId}
          onChange={(e) => onSelectSample(e.target.value)}
        >
          {samples.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="dropdown-chevron" />
      </div>
    </div>
  );
}
