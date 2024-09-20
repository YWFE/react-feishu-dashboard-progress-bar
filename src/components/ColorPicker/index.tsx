import { useMemo, useRef, useState } from 'react';
import './style.scss';

const colors: { value: string; val: string }[] = [
  {
    value: 'var(--ccm-chart-N700)',
    val: '#373c43',
  },
  {
    value: 'var(--ccm-chart-B500)',
    val: '#3370ff',
  },
  {
    value: 'var(--ccm-chart-I500)',
    val: '#4954e6',
  },
  {
    value: 'var(--ccm-chart-G500)',
    val: '#34c724',
  },
  {
    value: 'var(--ccm-chart-W500)',
    val: '#14c0ff',
  },
  {
    value: 'var(--ccm-chart-Y500)',
    val: '#ffc60a',
  },
  {
    value: 'var(--ccm-chart-O500)',
    val: '#f80',
  },
  {
    value: 'var(--ccm-chart-R400)',
    val: '#f76964',
  },
];

export function ColorPicker(props: {
  onChange: (color: string, colorStr?: string) => void;
  value: string;
}) {
  return (
    <div className="color-picker">
      {colors.map(({ value, val }) => (
        <div
          onClick={() => {
            props.onChange(value, val);
          }}
          key={value}
          style={{
            borderColor: props.value === value ? value : 'transparent',
          }}
          className="color-picker-color-container"
        >
          <div
            style={{
              backgroundColor: value,
            }}
            className="color-picker-color"
          >
            {props.value === value || props.value === val ? (
              <div className="selected-icon-container"></div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
