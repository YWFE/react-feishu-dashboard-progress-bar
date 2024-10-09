import {
  dashboard,
  bitable,
  DashboardState,
  IConfig,
  base,
  SourceType,
  FieldType,
} from '@lark-base-open/js-sdk';
import {
  RadioGroup,
  Radio,
  InputNumber,
  Banner,
  Button,
} from '@douyinfe/semi-ui';
import { Select } from 'antd';
import { useState, useEffect, useRef } from 'react';
import { Item } from '../../Item';
import { ColorPicker } from '../../ColorPicker';
import CommonFilter from '../../CommonFilter';
import { IconConfigStroked } from '@douyinfe/semi-icons';
import { NUMBER_FORMAT_ENU } from './../contant';

import '../style.scss';

function ConfigPanel(props: {
  t: any;
  configDefault: any;
  pageConfig: any;
  getTableRange: any;
  getCategories: any;
  setPageConfig: any;
  tableList: any[];
  tableFileds: any[];
  tableSource: any[];
  dataRange: any[];
  setDataRange: React.Dispatch<React.SetStateAction<any[]>>;
  categories: any[];
  setCategories: React.Dispatch<React.SetStateAction<any[]>>;
}) {
  const {
    t,
    configDefault,
    pageConfig,
    getTableRange,
    getCategories,
    setPageConfig,
    tableSource,
    dataRange,
    setDataRange,
    categories,
    setCategories,
  } = props;

  /**保存配置 */
  const onSaveConfig = () => {
    dashboard.saveConfig({
      customConfig: pageConfig,
    } as any);
  };

  const resetPageConfig = (opt?: any) => {
    setPageConfig({
      ...configDefault,
      ...opt,
    });
  };

  return (
    <div
      className="config-panel"
      style={{
        overflow: 'auto',
      }}
    >
      <div
        style={{
          height: 'calc(100vh - 100px)',
          overflow: 'auto',
        }}
        className="form"
      >
        <Item label="数据源">
          <Select
            value={pageConfig?.tableSourceSelected}
            style={{ width: '100%' }}
            onChange={async (val) => {
              const [tableRanges, categories] = await Promise.all([
                getTableRange(val),
                getCategories(val),
              ]);
              setDataRange([...tableRanges]);
              setCategories([...categories]);
              resetPageConfig({
                tableSourceSelected: val,
                color: pageConfig.color,
              });
            }}
            options={(tableSource || []).map((source) => ({
              value: source.tableId,
              label: source.tableName,
            }))}
          />
        </Item>
        <Item label="数据范围">
          <Select
            style={{ width: '100%' }}
            key={`${pageConfig?.tableSourceSelected}-dataRange`}
            value={
              pageConfig?.dataRangeSelected
                ? JSON.stringify(pageConfig?.dataRangeSelected)
                : ''
            }
            onChange={(val: string) => {
              setPageConfig({
                ...pageConfig,
                dataRangeSelected: JSON.parse(val),
              });
            }}
            options={dataRange.map((range) => {
              const { type } = range;
              if (type === SourceType.ALL) {
                return {
                  value: JSON.stringify(range),
                  label: '全部数据',
                };
              } else {
                return {
                  value: JSON.stringify(range),
                  label: range.viewName,
                };
              }
            })}
          />
        </Item>
        <Item label="筛选器字段">
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            key={`${pageConfig?.tableSourceSelected}-categories`}
            value={pageConfig?.categoriesSelected}
            onChange={(val) => {
              const categoriesSelectedOpt: any = val.map((cItem: string) =>
                JSON.parse(cItem)
              );
              if (val.length === 0) {
                setPageConfig({
                  ...pageConfig,
                  categoriesSelected: val,
                  categoriesSelectedOtherConfig: [],
                });
                return;
              }
              const { categoriesSelectedOtherConfig = [] } = pageConfig;
              const arr: any = [];
              categoriesSelectedOpt.forEach((cItem: any) => {
                if (
                  !categoriesSelectedOtherConfig.find(
                    (oItem: any) => oItem?.fieldId === cItem?.fieldId
                  )
                ) {
                  let opt = {
                    ...cItem,
                    defaultValue: cItem?.fieldType === 5 ? [] : '',
                    isHide: true,
                  };
                  if (cItem?.fieldType === 5) {
                    opt = {
                      ...opt,
                      timeType: 'dateRange',
                    };
                  }
                  arr.push(opt);
                } else {
                  arr.push({
                    ...categoriesSelectedOtherConfig.find(
                      (oItem: any) => oItem?.fieldId === cItem?.fieldId
                    ),
                  });
                }
              });
              setPageConfig({
                ...pageConfig,
                categoriesSelected: val,
                categoriesSelectedOtherConfig: [...arr],
              });
            }}
            options={categories
              .filter((cItem) => cItem.fieldType === 5)
              .map((category) => {
                return {
                  value: JSON.stringify(category),
                  label: category.fieldName,
                };
              })}
          />
          <Banner
            type="warning"
            style={{ marginTop: '10px' }}
            closeIcon={null}
            description="当前仅支持日期格式的筛选能力"
          />
        </Item>
        {/* 设置选择器 配置 */}
        {pageConfig?.categoriesSelectedOtherConfig &&
        pageConfig?.categoriesSelectedOtherConfig.length ? (
          <CommonFilter
            filterItems={pageConfig?.categoriesSelectedOtherConfig || []}
            pageConfig={pageConfig}
            upDatePageConfig={setPageConfig}
          />
        ) : null}
        <Item label="目标值">
          <RadioGroup
            type="button"
            style={{
              background: '#f0f0f0',
            }}
            value={pageConfig?.targetValueType}
            aria-label=""
            name="demo-radio-group"
            onChange={(e) => {
              setPageConfig({
                ...pageConfig,
                targetValueType: e.target.value,
              });
            }}
          >
            <Radio value={'1'}>自定义值</Radio>
            <Radio value={'2'}>多维表格数据</Radio>
          </RadioGroup>
          {pageConfig?.targetValueType === '1' ? (
            <InputNumber
              hideButtons
              placeholder={'请输入目标值'}
              style={{ width: '100%', marginTop: '10px' }}
              value={pageConfig?.targetValue}
              maxLength={16}
              precision={2}
              onChange={(val) => {
                setPageConfig({
                  ...pageConfig,
                  targetValue: val,
                });
              }}
            />
          ) : null}
          {pageConfig?.targetValueType === '2' ? (
            <Select
              style={{ width: '100%', marginTop: '10px' }}
              value={pageConfig?.targetValueTypeKind}
              options={[
                {
                  label: '统计字段总数',
                  value: 'COUNTA',
                },
                {
                  label: '统计字段数值',
                  value: 'VALUE',
                },
              ]}
              onChange={(val) => {
                setPageConfig({
                  ...pageConfig,
                  targetValueTypeKind: val,
                });
              }}
            ></Select>
          ) : null}
          {pageConfig?.targetValueType === '2' &&
          pageConfig?.targetValueTypeKind === 'VALUE' ? (
            <Select
              style={{ width: '100%', marginTop: '10px' }}
              value={pageConfig?.targetValue}
              options={categories
                .filter(
                  (cItem) => cItem.fieldType === 19 || cItem.fieldType === 2
                )
                .map((category) => ({
                  label: category.fieldName,
                  value: category.fieldId,
                }))}
              onChange={(val) => {
                setPageConfig({
                  ...pageConfig,
                  targetValue: val,
                });
              }}
            ></Select>
          ) : null}
          {pageConfig?.targetValueType === '2' &&
          pageConfig?.targetValueTypeKind === 'VALUE' ? (
            <div>
              <span>计算方式：</span>
              <Select
                style={{ width: '229px', marginTop: '10px' }}
                value={pageConfig?.targetValueComputed}
                onChange={(val) => {
                  setPageConfig({
                    ...pageConfig,
                    targetValueComputed: val,
                  });
                }}
                options={[
                  {
                    label: '求和',
                    value: 'sum',
                  },
                  {
                    label: '平均值',
                    value: 'avg',
                  },
                  {
                    label: '最大值',
                    value: 'max',
                  },
                  {
                    label: '最小值',
                    value: 'min',
                  },
                ]}
              ></Select>
            </div>
          ) : null}
          <div className="m-t-10">
            <span className="m-r-10">格式：</span>
            <Select
              value={pageConfig?.targetFormat}
              style={{ width: '229px', marginTop: '10px' }}
              onChange={(val) => {
                setPageConfig({
                  ...pageConfig,
                  targetFormat: val,
                });
              }}
              options={NUMBER_FORMAT_ENU}
            />
          </div>
        </Item>
        <Item label="当前值">
          <RadioGroup
            type="button"
            // value={value}
            value={pageConfig?.currentValueType}
            aria-label=""
            name="demo-radio-group"
            style={{
              background: '#f0f0f0',
            }}
            onChange={(e) => {
              setPageConfig({
                ...pageConfig,
                currentValueType: e.target.value,
              });
            }}
          >
            <Radio value={'1'}>自定义值</Radio>
            <Radio value={'2'}>多维表格数据</Radio>
          </RadioGroup>
          {pageConfig?.currentValueType === '1' ? (
            <InputNumber
              style={{ width: '100%', marginTop: '10px' }}
              hideButtons
              placeholder={'请输入当前值'}
              maxLength={16}
              precision={2}
              value={pageConfig?.currentValue}
              onChange={(val) => {
                setPageConfig({
                  ...pageConfig,
                  currentValue: val,
                });
              }}
            />
          ) : null}
          {pageConfig?.currentValueType === '2' ? (
            <Select
              style={{ width: '100%', marginTop: '10px' }}
              value={pageConfig?.currentValueTypeKind}
              options={[
                {
                  label: '统计字段总数',
                  value: 'COUNTA',
                },
                {
                  label: '统计字段数值',
                  value: 'VALUE',
                },
              ]}
              onChange={(val) => {
                setPageConfig({
                  ...pageConfig,
                  currentValueTypeKind: val,
                  currentValue: null,
                });
              }}
            ></Select>
          ) : null}
          {pageConfig?.currentValueType === '2' &&
          pageConfig?.currentValueTypeKind === 'VALUE' ? (
            // 99002 进度 99003 金额 99004 评分 2 数值
            <Select
              style={{ width: '100%', marginTop: '10px' }}
              value={pageConfig?.currentValue}
              options={(categories || [])
                // .filter((cItem) =>
                //   [2, 19, 99002, 99003, 99004].includes(cItem.fieldType)
                // )
                .map((category) => ({
                  label: category.fieldName,
                  value: category.fieldId,
                  type: category.fieldType,
                }))}
              onChange={(val, obj: any) => {
                setPageConfig({
                  ...pageConfig,
                  currentValue: val,
                  currentValueWarn: ![2, 19, 99002, 99003, 99004].includes(
                    obj.type
                  ),
                });
              }}
            ></Select>
          ) : null}
          {
            // 99002 进度 99003 金额 99004 评分 2 数值 异常警告
            pageConfig?.currentValueWarn ? (
              <Banner
                type="warning"
                style={{ marginTop: '10px' }}
                closeIcon={null}
                description="当前字段格式类型不支持计算，请确认字段类型为数值类型"
              />
            ) : null
          }
          {pageConfig?.currentValueType === '2' &&
          pageConfig?.currentValueTypeKind === 'VALUE' ? (
            <div>
              <span>计算方式：</span>
              <Select
                style={{ width: '229px', marginTop: '10px' }}
                value={pageConfig?.currentValueComputed}
                onChange={(val) => {
                  setPageConfig({
                    ...pageConfig,
                    currentValueComputed: val,
                  });
                }}
                options={[
                  {
                    label: '求和',
                    value: 'sum',
                  },
                  {
                    label: '平均值',
                    value: 'avg',
                  },
                  {
                    label: '最大值',
                    value: 'max',
                  },
                  {
                    label: '最小值',
                    value: 'min',
                  },
                ]}
              ></Select>
            </div>
          ) : null}
          <div className="m-t-10">
            <span className="m-r-10">格式：</span>
            <Select
              value={pageConfig?.currentFormat}
              style={{ width: '229px', marginTop: '10px' }}
              onChange={(val) => {
                setPageConfig({
                  ...pageConfig,
                  currentFormat: val,
                });
              }}
              options={NUMBER_FORMAT_ENU}
            />
          </div>
        </Item>
        <Item label={'颜色'}>
          <ColorPicker
            value={pageConfig.color}
            onChange={(v, val) => {
              setPageConfig({
                ...pageConfig,
                color: val,
              });
            }}
          ></ColorPicker>
        </Item>
        <Item label="单位">
          <Select
            allowClear
            value={pageConfig?.unit}
            style={{ width: '100%' }}
            onChange={(val) => {
              setPageConfig({
                ...pageConfig,
                unit: val || '',
              });
            }}
            options={[
              {
                value: '个',
                label: '个',
              },
              {
                value: '元',
                label: '元',
              },
            ]}
          />
        </Item>
        <Item label="精度">
          <Select
            value={pageConfig?.format}
            style={{ width: '100%' }}
            onChange={(val) => {
              setPageConfig({
                ...pageConfig,
                format: val,
              });
            }}
            options={[
              {
                value: '0',
                label: '整数',
              },
              {
                value: '1',
                label: '保留1位小数',
              },
              {
                value: '2',
                label: '保留2位小数',
              },
            ]}
          />
        </Item>
        <Item label="百分比格式">
          <Select
            value={pageConfig?.percentageFormat}
            style={{ width: '100%' }}
            onChange={(val) => {
              setPageConfig({
                ...pageConfig,
                percentageFormat: val,
              });
            }}
            options={[
              {
                value: '0',
                label: '整数',
              },
              {
                value: '1',
                label: '保留1位小数',
              },
              {
                value: '2',
                label: '保留2位小数',
              },
            ]}
          />
        </Item>
      </div>

      <Button className="btn" theme="solid" onClick={onSaveConfig}>
        {t('confirm')}
      </Button>
    </div>
  );
}

export default ConfigPanel;
