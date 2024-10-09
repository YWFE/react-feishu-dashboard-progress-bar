import React from 'react';
import { Checkbox, Tag, DatePicker, Switch } from '@douyinfe/semi-ui';
import { IconPriceTag } from '@douyinfe/semi-icons';
import { IconConfig } from '@douyinfe/semi-icons-lab';
import { Item } from '../Item';
import './style.scss';
import { BaseDatePicker } from '@douyinfe/semi-ui/lib/es/datePicker';

function CommonFilter(props: {
  filterItems: any[];
  pageConfig: any;
  upDatePageConfig: any;
}) {
  const { filterItems, pageConfig, upDatePageConfig } = props;

  const presets = [
    {
      text: '今天',
      start: new Date(),
      end: new Date(),
    },
    {
      text: '最近7天',
      start: new Date(new Date().valueOf() - 1000 * 3600 * 24 * 7),
      end: new Date(),
    },
    {
      text: '最近30天',
      start: new Date(new Date().valueOf() - 1000 * 3600 * 24 * 30),
      end: new Date(),
    },
    {
      // 本月
      text: '本月',
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      end: new Date(),
    },
    // 本年
    {
      text: '本年',
      start: new Date(new Date().getFullYear(), 0, 1),
      end: new Date(),
    },
  ];

  // 快捷选择日期
  const presetsRender = (callBack: any) => {
    return (
      <div
        className="filter-content-actions"
        style={{
          paddingRight: '16px',
        }}
      >
        <Tag
          size="small"
          color="light-blue"
          onClick={() => {
            callBack([new Date(), new Date()]);
          }}
        >
          今天
        </Tag>
        <Tag
          size="small"
          color="light-blue"
          onClick={() => {
            callBack([
              new Date(new Date().valueOf() - 1000 * 3600 * 24 * 7),
              new Date(),
            ]);
          }}
        >
          最近7天
        </Tag>
        <Tag
          size="small"
          color="light-blue"
          onClick={() => {
            callBack([
              new Date(new Date().valueOf() - 1000 * 3600 * 24 * 30),
              new Date(),
            ]);
          }}
        >
          最近30天
        </Tag>
        <Tag
          size="small"
          color="light-blue"
          onClick={() => {
            callBack([
              new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              new Date(),
            ]);
          }}
        >
          本月
        </Tag>
        <Tag
          size="small"
          color="light-blue"
          onClick={() => {
            callBack([new Date(new Date().getFullYear(), 0, 1), new Date()]);
          }}
        >
          本年
        </Tag>
      </div>
    );
  };

  return (
    <Item label="筛选器配置">
      {filterItems.map((cItem: any) => {
        const { fieldType, fieldName, fieldId, isHide } = cItem;
        const timeType = fieldType === 5 ? cItem?.timeType || 'dateRange' : '';
        // 日期
        if (fieldType === 5) {
          return (
            <div
              className="categories-selected-otherConfig-item"
              key={`categoriesSelectedOtherConfig-${fieldId}`}
            >
              <div>
                <Tag
                  prefixIcon={
                    <IconPriceTag size="small" style={{ color: '#1456f0' }} />
                  }
                  size="large"
                  color="blue"
                >
                  {' '}
                  {fieldName}{' '}
                </Tag>
              </div>
              <div className="m-t-5 flex-a-c">
                <span>是否时间范围：</span>
                <Switch
                  checked={cItem.timeType === 'dateRange'}
                  size="small"
                  onChange={(v, e) => {
                    const arr = (filterItems || []).map((oItem: any) => {
                      if (oItem.fieldId === cItem.fieldId) {
                        return {
                          ...oItem,
                          timeType: v ? 'dateRange' : 'date',
                          defaultValue: v ? [] : '',
                        };
                      }
                      return oItem;
                    });
                    upDatePageConfig({
                      ...pageConfig,
                      categoriesSelectedOtherConfig: arr,
                    });
                  }}
                  aria-label="a switch for demo"
                ></Switch>
              </div>
              <div className="m-t-5">
                <span className="categories-selected-otherConfig-item-label">
                  默认值：
                </span>
                <DatePicker
                  key={`categoriesSelectedOtherConfig-${fieldId}-item`}
                  presets={timeType === 'dateRange' ? presets : undefined}
                  className="m-t-5"
                  type={cItem?.timeType || 'dateRange'}
                  value={cItem.defaultValue}
                  format="yyyy/MM/dd"
                  onChange={(val) => {
                    const arr = (filterItems || []).map((oItem: any) => {
                      if (oItem.fieldId === cItem.fieldId) {
                        return {
                          ...oItem,
                          defaultValue: val,
                        };
                      }
                      return oItem;
                    });
                    upDatePageConfig({
                      ...pageConfig,
                      categoriesSelectedOtherConfig: arr,
                    });
                  }}
                ></DatePicker>
                {cItem?.timeType !== 'date' &&
                  presetsRender((val: any) => {
                    const arr = (filterItems || []).map((oItem: any) => {
                      if (oItem.fieldId === cItem.fieldId) {
                        return {
                          ...oItem,
                          defaultValue: val,
                        };
                      }
                      return oItem;
                    });
                    upDatePageConfig({
                      ...pageConfig,
                      categoriesSelectedOtherConfig: arr,
                    });
                  })}
              </div>
              <div className="flex-a-c m-t-5">
                <span className="categories-selected-otherConfig-item-label">
                  是否隐藏：
                </span>
                <span>
                  <Checkbox
                    checked={isHide}
                    onChange={(e) => {
                      const arr = (filterItems || []).map((oItem: any) => {
                        if (oItem.fieldId === cItem.fieldId) {
                          return {
                            ...oItem,
                            isHide: e.target.checked,
                          };
                        }
                        return oItem;
                      });
                      upDatePageConfig({
                        ...pageConfig,
                        categoriesSelectedOtherConfig: arr,
                      });
                    }}
                  ></Checkbox>
                </span>
              </div>
            </div>
          );
        }
        return '';
      })}
    </Item>
  );
}

export default CommonFilter;
