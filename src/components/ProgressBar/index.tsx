import './style.scss';
import React, { useLayoutEffect, useMemo } from 'react';
import {
  dashboard,
  bitable,
  DashboardState,
  IConfig,
  base,
  SourceType,
  FieldType,
} from '@lark-base-open/js-sdk';
// import { Button, DatePicker, ConfigProvider, Checkbox, Row, Col, Input, Switch, Select as DySelect } from '@douyinfe/semi-ui';
import {
  useFormApi,
  Form,
  DatePicker,
  Col,
  Row,
  Input,
  RadioGroup,
  Radio,
  InputNumber,
} from '@douyinfe/semi-ui';
import { Button, Checkbox, Switch, Select } from 'antd';
import { useState, useEffect, useRef, useCallback } from 'react';
import * as echarts from 'echarts';
import { getTime } from './utils';
import { useConfig } from '../../hooks';
import dayjs from 'dayjs';
import classnames from 'classnames';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next/typescript/t';
import { ColorPicker } from '../ColorPicker';
import { Indicator } from './components/indicator';
import { Item } from '../Item';
import { YwTable } from '@ywfe/yw-design';
import { use } from 'i18next';
import { c } from 'vite/dist/node/types.d-aGj9QkWt';

/** 符合convertTimestamp的日期格式 */
const titleDateReg = /\d{4}-\d{1,2}-\d{1,2}\s\d+:\d+:\d{1,2}/;

interface ICountDownConfig {
  color: string;
  /** 毫秒级时间戳 */
  target: number;
  units: string[];
  othersConfig: string[];
  title: string;
  showTitle: boolean;
  /** 是否显示倒计时 */
  showCountDown: boolean;
}

const othersConfigKey: { key: string; title: string }[] = [];

const defaultOthersConfig = ['showTitle'];

const getAvailableUnits: (t: TFunction<'translation', undefined>) => {
  [p: string]: { title: string; unit: number; order: number };
} = (t) => {
  return {
    sec: {
      title: t('second'),
      unit: 1,
      order: 1,
    },
    min: {
      title: t('minute'),
      unit: 60,
      order: 2,
    },
    hour: {
      title: t('hour'),
      unit: 60 * 60,
      order: 3,
    },
    day: {
      title: t('day'),
      unit: 60 * 60 * 24,
      order: 4,
    },
    week: {
      title: t('week'),
      unit: 60 * 60 * 24 * 7,
      order: 5,
    },
    month: {
      title: t('month'),
      unit: 60 * 60 * 24 * 30,
      order: 6,
    },
  };
};

const defaultUnits = ['sec', 'min', 'hour', 'day'];

// 获取全部数据来源
const getTableSourceList = async () => {
  const tables = await bitable.base.getTableList();
  return await Promise.all(
    tables.map(async (table) => {
      const name = await table.getName();
      return {
        tableId: table.id,
        tableName: name,
      };
    })
  );
};

const getTableRange = (tableId: string) => {
  return dashboard.getTableDataRange(tableId);
};

const getCategories = (tableId: string) => {
  return dashboard.getCategories(tableId);
};

/** 插件主体 */
export default function ProgressBar() {
  const { t, i18n } = useTranslation();

  // create时的默认配置
  const [config, setConfig] = useState<ICountDownConfig>({
    target: new Date().getTime(),
    color: 'var(--ccm-chart-N700)',
    units: defaultUnits,
    title: t('target.remain'),
    showTitle: false,
    showCountDown: true,
    othersConfig: defaultOthersConfig,
  });

  // create时的默认配置new
  const [pageConfig, setPageConfig] = useState<any>({
    color: '#373c43',
    tableSourceSelected: '',
    dataRangeSelected: '',
    categoriesSelected: [],
    // 单位
    unit: '0',
    // 格式
    format: '1',
    // 百分比格式
    percentageFormat: '1',
    // 目标值类型
    targetValueType: '1',
    targetValueTypeKind: '',
    targetValue: '',
    targetValueComputed: 'sum',
    // 当前值类型
    currentValueType: '1',
    currentValueTypeKind: '',
    currentValue: '',
    currentValueComputed: 'sum',
  });

  const [tableSource, setTableSource] = useState<any[]>([]);
  const [dataRange, setDataRange] = useState<any[]>([{ type: SourceType.ALL }]);
  const [categories, setCategories] = useState<any[]>([]);

  const [renderData, setRenderData] = useState<any>({
    targetVal: '',
    targetValStr: '',
    currentVal: '',
    currentValStr: '',
    percentage: '',
  });

  const [tableList, setTableList] = useState<any[]>([]);
  const [tableFileds, setTableFileds] = useState<any[]>([]);

  const log = console.log.bind(console);

  const availableUnits = useMemo(() => getAvailableUnits(t), [i18n.language]);

  /** 是否配置/创建模式下 */
  const isCreate = dashboard.state === DashboardState.Create;
  const isConfig = dashboard.state === DashboardState.Config || isCreate;

  const timer = useRef<any>();

  /** 配置用户配置 */
  const updateConfig = (res: IConfig) => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    console.log('updateConfig res =>', res);
    const { customConfig } = res;
    if (customConfig) {
      setPageConfig(customConfig as any);
      timer.current = setTimeout(() => {
        //自动化发送截图。 预留3s给浏览器进行渲染，3s后告知服务端可以进行截图了（对域名进行了拦截，此功能仅上架部署后可用）。
        dashboard.setRendered();
        getData({
          ...customConfig,
        });
      }, 3000);
    }
  };

  const getInit = async () => {
    // 获取table数据来源
    const tableSourceList = await getTableSourceList();
    setTableSource(tableSourceList);

    // 创建阶段没有任何配置，设置默认配置
    const tableId = tableSourceList[0]?.tableId;

    const [tableRanges, categories] = await Promise.all([
      getTableRange(tableId),
      getCategories(tableId),
    ]);
    console.log('tableSourceList =>', tableRanges, categories);

    setDataRange(tableRanges);
    setCategories(categories);
  };

  // 绘制chart
  const drawChart = () => {
    const { targetVal, targetValStr, currentVal, currentValStr, percentage } =
      renderData;
    document.getElementById('main')?.removeAttribute('_echarts_instance_');
    var myChart = echarts.init(document.getElementById('main'));
    // 绘制图表
    const option = {
      title: {
        // text: '测试进度条',
        show: false,
      },
      tooltip: {
        show: false,
      },
      // backgroundColor: '#17326b',
      grid: {
        left: '0',
        top: '10',
        right: '0',
        bottom: '0',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        splitLine: { show: false },
        axisLabel: {
          show: false,
        },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      yAxis: [
        {
          type: 'category',
          axisTick: { show: false },
          axisLine: { show: false },
          axisLabel: {
            show: false,
          },
          data: ['进度'],
          max: 1, // 关键：设置y刻度最大值，相当于设置总体行高
          inverse: true,
        },
        // {
        //   type: 'category',
        //   axisTick: { show: false },
        //   axisLine: { show: false },
        //   axisLabel: {
        //     fontSize: 14,
        //     textStyle: {
        //       color: '#666',
        //       fontWeight: 'bold',
        //     },
        //   },
        //   data: [percentage],
        //   max: 1, // 关键：设置y刻度最大值，相当于设置总体行高
        //   inverse: true,
        // },
      ],
      series: [
        {
          name: '条',
          type: 'bar',
          barWidth: 20,
          data: [currentVal || 0],
          // barCategoryGap: 20,
          itemStyle: {
            normal: {
              barBorderRadius: 10,
              color: pageConfig.color,
              // color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              //   {
              //     offset: 0,
              //     color: '#22b6ed',
              //   },
              //   {
              //     offset: 1,
              //     color: '#3fE279',
              //   },
              // ]),
            },
          },
          // label: {
          //   show: true,
          //   color: 'red',
          //   fontSize: 20,
          // },
          zlevel: 1,
        },
        {
          name: '进度条背景',
          type: 'bar',
          barGap: '-100%',
          barWidth: 20,
          data: [targetVal || 100],
          color: '#e0e0e0',
          itemStyle: {
            normal: {
              barBorderRadius: 10,
            },
          },
        },
      ],
    };
    console.log('option =>', option);
    myChart.setOption(option, true);
  };

  // 计算数值
  const computeValue = (valArr: any, type: string) => {
    // sum
    if (type === 'sum') {
      return valArr.reduce((prev: any, next: any) => {
        return +prev + +next;
      });
    } else if (type === 'avg') {
      return (
        valArr.reduce((prev: any, next: any) => {
          return +prev + +next;
        }) / valArr.length
      );
    } else if (type === 'max') {
      return Math.max(...valArr);
    } else if (type === 'min') {
      return Math.min(...valArr);
    }
    return 0;
  };

  useConfig(updateConfig);

  const getData = async (obj?: any) => {
    const pageConfigInfo = obj
      ? obj
      : {
          ...pageConfig,
        };
    getInit();
    // if (
    //   dashboard.state === DashboardState.Config ||
    //   dashboard.state === DashboardState.Create
    // ) {
    //   console.log('dashboard.state=>', dashboard, DashboardState);
    //   const tableList: any = await base.getTableList();
    //   log('tableList=>', tableList);
    //   setTableList([...(tableList || [])]);
    //   const tableCategories = await dashboard.getCategories(tableList[0].id);
    //   setTableFileds([...(tableCategories || [])]);
    //   log('tableCategories=>', tableCategories);
    //   const ranges = await dashboard.getTableDataRange(tableList[0].id);
    //   const preData = await dashboard.getPreviewData({
    //     tableId: tableList[0].id,
    //     dataRange: ranges[0],
    //   });
    //   log('preData=>', preData);
    // }

    if (
      dashboard.state === DashboardState.View ||
      dashboard.state === DashboardState.Config ||
      dashboard.state === DashboardState.Create
    ) {
      console.log('pageConfigInfo =>', pageConfigInfo);
      // const tableData = await dashboard.getData();
      // const tableList = await base.getTableList();
      // const view = await table.getViewById(viewId);
      // console.log('tableData =>', tableData);
      // console.log('tableList =>', tableList);
      const table = await bitable.base.getTableById(
        pageConfigInfo.tableSourceSelected
      );
      // console.log('table=>', table);
      // log('view tableList=>', tableList);
      // const metaData = await table.getMeta();
      // console.log('metaData =>', metaData);
      // //获取table数据表的字段列表元信息。Get table's field meta list
      // const fieldMetaList = await table.getFieldMetaList();
      // console.log('fieldMetaList =>', fieldMetaList);
      // //获取table的所有记录的ID。 Get all records
      // const recordIdList = await table.getRecordIdList();
      // console.log('recordIdList =>', recordIdList);
      // 获取table的所有记录。 Get all records
      const records =
        (await table.getRecords({ pageSize: 5000 })).records || [];
      // const recordData = (records?.records || []).map((record) => ());
      let currentValues: any = {
        targetVal: 0,
        currentVal: 0,
        percentage: 0,
      };
      // 设置目标值
      if (pageConfigInfo?.targetValueType === '1') {
        // 自定义值
        currentValues.targetVal = (pageConfigInfo?.targetValue).toFixed(
          +pageConfigInfo?.format || 0
        );
      } else if (
        pageConfigInfo?.targetValueType === '2' &&
        pageConfigInfo?.targetValueTypeKind === 'COUNTA'
      ) {
        // 多维表格数据字段数值
        currentValues.targetVal = Object.keys(records[0].fields).length;
      } else if (pageConfigInfo?.targetValueType === '2') {
        // 多维表格数据
        const arr: any = [];
        records.forEach((record: any) => {
          arr.push(record.fields[pageConfigInfo?.targetValue]);
        });
        currentValues.targetVal = computeValue(
          arr,
          pageConfigInfo?.targetValueComputed
        ).toFixed(+pageConfigInfo?.format || 0);
      }
      // 设置当前值
      if (pageConfigInfo?.currentValueType === '1') {
        // 自定义值
        currentValues.currentVal = (pageConfigInfo?.currentValue).toFixed(
          +pageConfigInfo?.format || 0
        );
      } else if (
        pageConfigInfo?.currentValueType === '2' &&
        pageConfigInfo?.currentValueTypeKind === 'COUNTA'
      ) {
        // 多维表格数据字段数值
        currentValues.currentVal = Object.keys(records[0].fields).length;
      } else if (pageConfigInfo?.targetValueType === '2') {
        // 多维表格数据
        const arr: any = [];
        records.forEach((record: any) => {
          arr.push(record.fields[pageConfigInfo?.currentValue]);
        });
        // arr 合计
        currentValues.currentVal = computeValue(
          arr,
          pageConfigInfo?.currentValueComputed
        ).toFixed(+pageConfigInfo?.format || 0);
      }
      // 设置百分比
      currentValues.percentage = (
        (currentValues.currentVal / currentValues.targetVal) *
        100
      ).toFixed(+pageConfigInfo?.percentageFormat || 0);
      // 设置显示值
      currentValues.targetValStr = `${currentValues.targetVal}${
        pageConfigInfo?.unit || ''
      }`;
      currentValues.currentValStr = `${currentValues.currentVal}${
        pageConfigInfo?.unit || ''
      }`;
      setRenderData(currentValues);
      // const tableList = await base.getTableList();
      // log('view tableList=>', tableList);
      // setTableList([...(tableList || [])]);
      // const tableCategories = await dashboard.getCategories(tableList[0].id);
      // setTableFileds([...(tableCategories || [])]);
      // log('view tableCategories=>', tableCategories);

      // //通过tableId获取table数据表。 Find current table by tableId
      // const table = await bitable.base.getTableById(tableList[0].id);
      // console.log('table=>', table);
      // //获取table数据表的字段列表元信息。Get table's field meta list
      // const fieldMetaList = await table.getFieldMetaList();
      // log('table==>', table, '\r\nfieldMetaList=>', fieldMetaList);
      // //获取table的所有记录的ID。 Get all records
      // // const recordIdList = await table.getRecordIdList();
      // // log('recordIdList=>', recordIdList);
      // // 获取table的所有记录。 Get all records
      // const records = await table.getRecords({ pageSize: 5000 });
      // log('records=>', records);
    }
  };

  useEffect(() => {
    drawChart();
  }, [JSON.stringify(renderData)]);

  useEffect(() => {
    if (
      dashboard.state === DashboardState.Config ||
      dashboard.state === DashboardState.Create
    ) {
      getData();
    }
  }, [JSON.stringify(pageConfig)]);

  useEffect(() => {
    if (
      dashboard.state === DashboardState.Config ||
      dashboard.state === DashboardState.Create
    ) {
      drawChart();
    }
  }, [pageConfig?.color]);

  useEffect(() => {
    if (isCreate) {
      setConfig({
        target: new Date().getTime(),
        color: 'var(--ccm-chart-N700)',
        units: defaultUnits,
        title: t('target.remain'),
        showTitle: false,
        showCountDown: true,
        othersConfig: defaultOthersConfig,
      });
    }
  }, [i18n.language, isCreate]);

  return (
    <main
      id="main-page"
      className={classnames({
        'main-config': isConfig,
        main: true,
      })}
    >
      <div className="content">
        <CountdownView
          t={t}
          availableUnits={availableUnits}
          // config={config}
          renderData={renderData}
          pageConfig={pageConfig}
          key={config.target}
          isConfig={isConfig}
        />
      </div>
      {isConfig ? (
        <ConfigPanel
          t={t}
          config={config}
          setConfig={setConfig}
          pageConfig={pageConfig}
          setPageConfig={setPageConfig}
          availableUnits={availableUnits}
          tableList={tableList}
          tableFileds={tableFileds}
          tableSource={tableSource}
          dataRange={dataRange}
          setDataRange={setDataRange}
          categories={categories}
          setCategories={setCategories}
        />
      ) : null}
    </main>
  );
}

interface ICountdownView {
  config: ICountDownConfig;
  pageConfig: any;
  isConfig: boolean;
  renderData: any;
  t: TFunction<'translation', undefined>;
  availableUnits: ReturnType<typeof getAvailableUnits>;
}
function CountdownView({
  pageConfig,
  isConfig,
  availableUnits,
  t,
  renderData,
}: ICountdownView) {
  const filterFormRef = useRef();

  const { targetVal, targetValStr, currentVal, currentValStr, percentage } =
    renderData;
  const { categoriesSelected } = pageConfig;
  const categoriesSelectedDatas = (categoriesSelected || []).map(
    (cItem: string) => JSON.parse(cItem)
  );

  // const [time, setTime] = useState(target ?? 0);
  // useEffect(() => {
  //   const timer = setInterval(() => {
  //     setTime((time) => {
  //       return time - 1;
  //     });
  //   }, 1000);

  //   return () => {
  //     clearInterval(timer);
  //   };
  // }, []);

  return (
    <div style={{ width: '100vw', textAlign: 'center', overflow: 'hidden' }}>
      <div>
        <Form
          ref={filterFormRef}
          layout="horizontal"
          style={{ padding: 10, width: '100%' }}
          onValueChange={(values) => {
            console.log(values);
          }}
        >
          <Row
            style={{
              width: '100%',
            }}
          >
            {categoriesSelectedDatas.map((cItem: any) => {
              const { fieldType } = cItem;
              if (fieldType === 1) {
                return (
                  <Col span={12}>
                    <Form.Input
                      field={cItem?.fieldId}
                      label={cItem?.fieldName}
                      // initValue={'mikeya'}
                      // style={{ width: '90%' }}
                      trigger="blur"
                    />
                  </Col>
                );
              } else if (fieldType === 5) {
                return (
                  <Col span={12}>
                    <Form.DatePicker
                      type="date"
                      insetInput
                      onChangeWithDateFirst={false}
                      field={cItem?.fieldId}
                      label={cItem?.fieldName}
                      style={{ width: '100%' }}
                      // format="yyyy-MM-dd"
                      // onChange={(date: any, dataString: string) => {
                      //   // console.log('date =>', date, dataString);
                      //   // 设置表单值为 dataString
                      //   filterFormRef.current.formApi.setValue(
                      //     cItem?.fieldId,
                      //     '1111'
                      //   );
                      // }}
                      // initValue={new Date()}
                      placeholder="请选择日期"
                    />
                  </Col>
                );
              }
              return '';
            })}
          </Row>
        </Form>
      </div>
      <div className="progress-info">
        <span>
          <span
            style={{
              color: pageConfig.color,
            }}
          >
            {currentValStr || '-'}
          </span>
          <span className="line">|</span>
          <span>{targetValStr || '-'}</span>
        </span>
        <span>{percentage || '-'}%</span>
      </div>
      <div
        id="main"
        style={{
          width: '100%',
          height: '50px',
        }}
      ></div>
    </div>
  );
}

/** 格式化显示时间 */
function convertTimestamp(timestamp: number) {
  return dayjs(timestamp / 1000).format('YYYY-MM-DD HH:mm:ss');
}

function ConfigPanel(props: {
  config: ICountDownConfig;
  setConfig: React.Dispatch<React.SetStateAction<ICountDownConfig>>;
  pageConfig: any;
  setPageConfig: any;
  tableList: any[];
  tableFileds: any[];
  availableUnits: ReturnType<typeof getAvailableUnits>;
  t: TFunction<'translation', undefined>;
  tableSource: any[];
  dataRange: any[];
  setDataRange: React.Dispatch<React.SetStateAction<any[]>>;
  categories: any[];
  setCategories: React.Dispatch<React.SetStateAction<any[]>>;
}) {
  const {
    config,
    setConfig,
    pageConfig,
    setPageConfig,
    availableUnits,
    t,
    tableList,
    tableFileds,
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
      color: '#373c43',
      tableSourceSelected: '',
      dataRangeSelected: '',
      categoriesSelected: [],
      // 单位
      unit: '0',
      // 格式
      format: '1',
      // 百分比格式
      percentageFormat: '1',
      // 目标值类型
      targetValueType: '1',
      targetValueTypeKind: '',
      targetValue: '',
      // 当前值类型
      currentValueType: '1',
      currentValueTypeKind: '',
      currentValue: '',
      ...opt,
    });
  };

  return (
    <div
      className="config-panel"
      style={{
        // maxHeight: 'calc(100% - 100px)',
        overflow: 'auto',
        // paddingBottom: '100px',
      }}
    >
      <div
        className="form"
        // style={{
        //   maxHeight: 'calc(100% - 100px)',
        //   overflow: 'auto',
        //   // paddingBottom: '100px',
        // }}
      >
        <Item label="数据源">
          <Select
            value={pageConfig?.tableSourceSelected}
            style={{ width: 200 }}
            onChange={async (val) => {
              const [tableRanges, categories] = await Promise.all([
                getTableRange(val),
                getCategories(val),
              ]);
              setDataRange(tableRanges);
              setCategories(categories);
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
            style={{ width: 200 }}
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
        <Item label="选择器">
          <Select
            mode="multiple"
            style={{ width: 200 }}
            value={pageConfig?.categoriesSelected}
            onChange={(val) => {
              setPageConfig({
                ...pageConfig,
                categoriesSelected: val,
              });
            }}
            options={categories
              .filter((cItem) => cItem.fieldType === 1 || cItem.fieldType === 5)
              .map((category) => {
                return {
                  value: JSON.stringify(category),
                  label: category.fieldName,
                };
              })}
          />
        </Item>
        {/* targetValueType: 1,
        targetValue: '',
        // 当前值类型
        currentValueType: 1,
        currentValue: '', */}
        <Item label="目标值">
          <RadioGroup
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
              style={{ width: 200, marginTop: '10px' }}
              value={pageConfig?.targetValue}
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
              style={{ width: 200, marginTop: '10px' }}
              value={pageConfig?.targetValueTypeKind}
              options={[
                {
                  label: '统计记录总数',
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
              style={{ width: 200, marginTop: '10px' }}
              value={pageConfig?.targetValue}
              options={categories
                .filter(
                  (cItem) => cItem.fieldType === 19 || cItem.fieldType === 20
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
                style={{ width: 200, marginTop: '10px' }}
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
        </Item>
        <Item label="当前值">
          <RadioGroup
            // value={value}
            value={pageConfig?.currentValueType}
            aria-label=""
            name="demo-radio-group"
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
              style={{ width: 200, marginTop: '10px' }}
              hideButtons
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
              style={{ width: 200, marginTop: '10px' }}
              value={pageConfig?.currentValueTypeKind}
              options={[
                {
                  label: '统计记录总数',
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
                });
              }}
            ></Select>
          ) : null}
          {pageConfig?.currentValueType === '2' &&
          pageConfig?.currentValueTypeKind === 'VALUE' ? (
            <Select
              style={{ width: 200, marginTop: '10px' }}
              value={pageConfig?.currentValue}
              options={categories
                .filter(
                  (cItem) => cItem.fieldType === 19 || cItem.fieldType === 20
                )
                .map((category) => ({
                  label: category.fieldName,
                  value: category.fieldId,
                }))}
              onChange={(val) => {
                setPageConfig({
                  ...pageConfig,
                  currentValue: val,
                });
              }}
            ></Select>
          ) : null}
          {pageConfig?.currentValueType === '2' &&
          pageConfig?.currentValueTypeKind === 'VALUE' ? (
            <div>
              <span>计算方式：</span>
              <Select
                style={{ width: 200, marginTop: '10px' }}
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
            value={pageConfig?.unit}
            style={{ width: 200 }}
            onChange={(val) => {
              setPageConfig({
                ...pageConfig,
                unit: val,
              });
            }}
            options={[
              {
                value: '',
                label: '无',
              },
              {
                value: '千',
                label: '千',
              },
              {
                value: '万',
                label: '万',
              },
              {
                value: '百万',
                label: '百万',
              },
              {
                value: '千万',
                label: '千万',
              },
              {
                value: '亿',
                label: '亿',
              },
            ]}
          />
        </Item>
        <Item label="格式">
          <Select
            value={pageConfig?.format}
            style={{ width: 200 }}
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
            style={{ width: 200 }}
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
