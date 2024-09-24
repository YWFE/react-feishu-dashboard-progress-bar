// no-check
import './style.scss';
import React, { useMemo } from 'react';
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
  Form,
  Col,
  Row,
  RadioGroup,
  Radio,
  InputNumber,
  Banner,
  Button,
} from '@douyinfe/semi-ui';
import { Select } from 'antd';
import { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
// import { getTime } from './utils';
import { useConfig } from '../../hooks';
// import dayjs from 'dayjs';
import classnames from 'classnames';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next/typescript/t';
import { ColorPicker } from '../ColorPicker';
import { Item } from '../Item';
import { NUMBER_FORMAT_ENU, formatNumber } from './contant';

let myChart: any = null; // echarts实例

/** 符合convertTimestamp的日期格式 */
// const titleDateReg = /\d{4}-\d{1,2}-\d{1,2}\s\d+:\d+:\d{1,2}/;

// const othersConfigKey: { key: string; title: string }[] = [];

// const defaultOthersConfig = ['showTitle'];
//  默认配置
const configDefault = {
  target: new Date().getTime(),
  color: '#373c43',
  tableSourceSelected: '',
  dataRangeSelected: '',
  categoriesSelected: [],
  // 单位
  unit: '无',
  // 精度
  format: '0',
  // 百分比格式
  percentageFormat: '0',
  // 目标值类型
  targetValueType: '1',
  targetValueTypeKind: '',
  targetValue: '',
  targetValueComputed: 'sum',
  // 格式
  targetFormat: '0',
  // 当前值类型
  currentValueType: '1',
  currentValueTypeKind: '',
  currentValue: '',
  currentValueComputed: 'sum',
  currentFormat: '0',
  currentValueWarn: false,
};

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

  const filterFormRef: any = useRef();

  // create时的默认配置new
  const [pageConfig, setPageConfig] = useState<any>({
    ...configDefault,
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

  // progress bar 宽度
  let barWidth = Math.min(60, (window.innerWidth / 187) * 10);
  barWidth = Math.max(10, barWidth);

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
    const { customConfig } = res;
    if (customConfig) {
      setPageConfig(customConfig as any);
      timer.current = setTimeout(() => {
        //自动化发送截图。 预留3s给浏览器进行渲染，3s后告知服务端可以进行截图了（对域名进行了拦截，此功能仅上架部署后可用）。
        dashboard.setRendered();
        getData({
          config: {
            ...customConfig,
          },
        });
      }, 3000);
    }
  };

  const getInit = async (tableSourceSelected?: string) => {
    // 获取table数据来源
    const tableSourceList = await getTableSourceList();
    setTableSource(tableSourceList);

    // 创建阶段没有任何配置，设置默认配置
    const tableId = tableSourceSelected || tableSourceList[0]?.tableId;

    const [tableRanges, categories] = await Promise.all([
      getTableRange(tableId),
      getCategories(tableId),
    ]);

    setDataRange(tableRanges);
    setCategories(categories);
  };

  // 绘制chart
  const drawChart = () => {
    const { targetVal, currentVal } = renderData;
    let showCurrentVal = currentVal;
    document.getElementById('main')?.removeAttribute('_echarts_instance_');
    myChart = echarts.init(document.getElementById('main'));
    if (currentVal - targetVal > 0) {
      showCurrentVal = targetVal;
    }
    if (
      dashboard.state === DashboardState.Config ||
      dashboard.state === DashboardState.Create
    ) {
      barWidth = 20;
    }
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
        show: false,
        left: '0',
        top: '0',
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
          barWidth,
          data: [showCurrentVal || 0],
          // barCategoryGap: 20,
          itemStyle: {
            normal: {
              barBorderRadius: barWidth / 2,
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
          barWidth,
          data: [targetVal || 100],
          color: '#e0e0e0',
          itemStyle: {
            normal: {
              barBorderRadius: barWidth / 2,
            },
          },
        },
      ],
    };
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
    const pageConfigInfo =
      obj && obj?.config
        ? {
            ...obj?.config,
          }
        : {
            ...pageConfig,
          };
    getInit(pageConfigInfo?.tableSourceSelected);

    if (
      dashboard.state === DashboardState.View ||
      dashboard.state === DashboardState.Config ||
      dashboard.state === DashboardState.Create
    ) {
      // const tableData = await dashboard.getData();
      // const tableList = await base.getTableList();
      // const view = await table.getViewById(viewId);
      // console.log('tableData =>', tableData);
      // console.log('tableList =>', tableList);
      const { categoriesSelected } = pageConfigInfo;
      // 获取过滤器配置
      const categoriesSelectedKeys = (categoriesSelected || []).map(
        (cItem: string) => JSON.parse(cItem)
      );

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
      const recordsOriginal =
        (await table.getRecords({ pageSize: 5000 })).records || [];
      const filterFormValues =
        obj?.filterFormValues ||
        (filterFormRef?.current && filterFormRef?.current?.formApi
          ? filterFormRef?.current?.formApi.getValues()
          : {}) ||
        {};
      const filterFormValuesKeys = Object.keys(filterFormValues);
      let records = [];
      // filterFormValuesKeys 循环过滤
      if (filterFormValuesKeys.length > 0) {
        records = recordsOriginal.filter((record: any) => {
          let isMatch = true;
          filterFormValuesKeys.forEach((key) => {
            let value = null;
            if (
              categoriesSelectedKeys.find(
                (cItem: any) => cItem?.fieldId === key
              )?.fieldType === 5
            ) {
              value = new Date(filterFormValues[key]).getTime();
            } else {
              value = filterFormValues[key];
            }
            if (value) {
              if (record.fields[key] !== value) {
                isMatch = false;
              }
            }
          });
          return isMatch;
        });
      } else {
        records = recordsOriginal;
      }

      // if (filterFormRef?.current) {
      //   console.log(
      //     'filterFormRef=>',
      //     filterFormRef.current,
      //     filterFormRef?.current?.formApi.getValues()
      //   );
      // }

      // const recordData = (records?.records || []).map((record) => ());
      let currentValues: any = {
        targetVal: 0,
        currentVal: 0,
        percentage: 0,
      };
      if (
        dashboard.state === DashboardState.View &&
        !pageConfigInfo?.targetValue &&
        !pageConfigInfo?.currentValue
      ) {
        currentValues.targetVal = '-';
        currentValues.currentVal = '-';
        currentValues.percentage = '-';
        // 设置显示值
        currentValues.targetValStr = '-';
        currentValues.currentValStr = '-';
        setRenderData(currentValues);
        return;
      }
      if (records.length) {
        // 设置目标值
        if (!pageConfigInfo?.targetValue) {
          currentValues.targetVal = '-';
          currentValues.targetValStr = '-';
        } else if (pageConfigInfo?.targetValueType === '1') {
          // 自定义值
          currentValues.targetVal = (+pageConfigInfo?.targetValue).toFixed(
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
          currentValues.targetVal = (+computeValue(
            arr,
            pageConfigInfo?.targetValueComputed
          )).toFixed(+pageConfigInfo?.format || 0);
        }
        // 设置当前值
        if (!pageConfigInfo?.currentValue) {
          currentValues.currentVal = '-';
          currentValues.currentValStr = '-';
        } else if (pageConfigInfo?.currentValueType === '1') {
          // 自定义值
          currentValues.currentVal = (+pageConfigInfo?.currentValue).toFixed(
            +pageConfigInfo?.format || 0
          );
        } else if (
          pageConfigInfo?.currentValueType === '2' &&
          pageConfigInfo?.currentValueTypeKind === 'COUNTA'
        ) {
          // 多维表格数据字段数值
          currentValues.currentVal = Object.keys(records[0].fields).length;
        } else if (pageConfigInfo?.currentValueType === '2') {
          // 多维表格数据
          const arr: any = [];
          records.forEach((record: any) => {
            arr.push(record.fields[pageConfigInfo?.currentValue]);
          });
          // arr 合计
          currentValues.currentVal = (+computeValue(
            arr,
            pageConfigInfo?.currentValueComputed
          )).toFixed(+pageConfigInfo?.format || 0);
        }
      } else {
        currentValues.targetVal = (0).toFixed(+pageConfigInfo?.format || 0);
        currentValues.currentVal = (0).toFixed(+pageConfigInfo?.format || 0);
      }

      if (!pageConfigInfo?.targetValue || !pageConfigInfo?.currentValue) {
        currentValues.percentage = '-';
      } else {
        // 设置百分比
        currentValues.percentage =
          +currentValues.currentVal && +currentValues.targetVal
            ? (
                ((currentValues.currentVal || 0) /
                  (currentValues.targetVal || 0)) *
                100
              ).toFixed(+pageConfigInfo?.percentageFormat || 0)
            : '0';
        // 设置显示值
        currentValues.targetValStr = `${currentValues.targetVal}${
          pageConfigInfo?.unit === '无' ? '' : pageConfigInfo?.unit
        }`;
        currentValues.currentValStr = `${currentValues.currentVal}${
          pageConfigInfo?.unit === '无' ? '' : pageConfigInfo?.unit
        }`;
      }
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
  }, [JSON.stringify(renderData), pageConfig?.color]);

  useEffect(() => {
    if (
      dashboard.state === DashboardState.Config ||
      dashboard.state === DashboardState.Create
    ) {
      getData();
    }
  }, [JSON.stringify(pageConfig)]);

  useEffect(() => {
    if (isCreate) {
      setPageConfig({
        ...configDefault,
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
        <ProgressBarView
          t={t}
          getData={getData}
          filterFormRef={filterFormRef}
          availableUnits={availableUnits}
          renderData={renderData}
          pageConfig={pageConfig}
          key={pageConfig.target}
          isConfig={isConfig}
          barWidth={barWidth}
        />
      </div>
      {isConfig ? (
        <ConfigPanel
          t={t}
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

interface IProgressBarView {
  pageConfig: any;
  isConfig: boolean;
  renderData: any;
  filterFormRef: any;
  getData: any;
  barWidth: any;
  t: TFunction<'translation', undefined>;
  availableUnits: ReturnType<typeof getAvailableUnits>;
}

// 展示端
function ProgressBarView({
  pageConfig,
  isConfig,
  availableUnits,
  t,
  filterFormRef,
  getData,
  renderData,
  barWidth,
}: IProgressBarView) {
  const { targetVal, targetValStr, currentVal, currentValStr, percentage } =
    renderData;
  const { categoriesSelected, targetFormat, currentFormat, format, unit } =
    pageConfig;
  const categoriesSelectedDatas = (categoriesSelected || []).map(
    (cItem: string) => JSON.parse(cItem)
  );

  // 获取字体大小
  const getFontSize = () => {
    let fontSizeNum = (window.innerWidth / 187) * 4;
    fontSizeNum = Math.min(5, fontSizeNum);
    fontSizeNum = Math.max(3, fontSizeNum);
    return `${fontSizeNum}vw`;
  };

  const [fontSize, setFontSize] = useState(
    dashboard.state === DashboardState.View ? getFontSize() : '2vw'
  );
  const [innerWidth, setInnerWidth] = useState(window.innerWidth);

  // 窗口变更 重新绘制
  const resizeChart = () => {
    if (
      dashboard.state === DashboardState.Config ||
      dashboard.state === DashboardState.Create
    ) {
      return;
    }
    setInnerWidth(window.innerWidth);
    // 更新图表
    myChart.setOption({
      series: [
        {
          barWidth: barWidth,
        },
        {
          barWidth: barWidth,
        },
      ],
    });
    myChart?.resize(true);
    // 更新字体大小
    setFontSize(getFontSize());
  };

  useEffect(() => {
    window.addEventListener('resize', resizeChart);

    return () => {
      window.removeEventListener('resize', resizeChart);
    };
  }, []);

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
    <div className="progress-bar-view">
      <div>
        <div
          style={{
            display: categoriesSelectedDatas.length > 0 ? 'block' : 'none',
            marginBottom: '10px',
          }}
        >
          <Form
            ref={filterFormRef}
            layout="horizontal"
            style={{ padding: 10, width: '100%' }}
            onValueChange={(values) => {
              getData({
                filterFormValues: values,
              });
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
                    <Col
                      span={innerWidth < 500 ? 24 : 12}
                      key={`filter-${cItem?.fieldId}`}
                      style={{
                        marginTop: innerWidth < 500 ? '5px' : '0',
                      }}
                    >
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
                    <Col
                      span={innerWidth < 500 ? 24 : 12}
                      key={`filter-${cItem?.fieldId}`}
                      style={{
                        marginTop: innerWidth < 500 ? '5px' : '0px',
                      }}
                    >
                      <Form.DatePicker
                        type="date"
                        insetInput
                        onChangeWithDateFirst={false}
                        field={cItem?.fieldId}
                        label={cItem?.fieldName}
                        style={{ width: '100%' }}
                        format="yyyy/MM/dd"
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
        <div
          className="progress-info"
          style={{
            fontSize,
          }}
        >
          <span>
            <span
              className="number"
              style={{
                color: pageConfig.color,
              }}
            >
              {currentVal && currentVal !== '-'
                ? `${formatNumber(currentVal, currentFormat, format)}${unit}`
                : '-'}
            </span>
            <span className="line"></span>
            <span className="number">
              {targetVal && targetVal !== '-'
                ? `${formatNumber(targetVal, targetFormat, format)}${unit}`
                : '-'}
            </span>
          </span>
          <span className="number">{percentage || '-'}%</span>
        </div>
        <div
          id="main"
          style={{
            width: '100%',
            height: '40px',
          }}
        ></div>
      </div>
    </div>
  );
}

// /** 格式化显示时间 */
// function convertTimestamp(timestamp: number) {
//   return dayjs(timestamp / 1000).format('YYYY-MM-DD HH:mm:ss');
// }

// 配置端

function ConfigPanel(props: {
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
    pageConfig,
    setPageConfig,
    t,
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
        // paddingBottom: '100px',
      }}
    >
      <div
        style={{
          height: 'calc(100vh - 100px)',
          overflow: 'auto',
          // paddingBottom: '100px',
        }}
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
            style={{ width: '100%' }}
            onChange={async (val) => {
              const [tableRanges, categories] = await Promise.all([
                getTableRange(val),
                getCategories(val),
              ]);
              console.log('categories =>', categories);
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
        <Item label="选择器">
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            key={`${pageConfig?.tableSourceSelected}-categories`}
            value={pageConfig?.categoriesSelected}
            onChange={(val) => {
              setPageConfig({
                ...pageConfig,
                categoriesSelected: val,
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
        {/* targetValueType: 1,
        targetValue: '',
        // 当前值类型
        currentValueType: 1,
        currentValue: '', */}
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
            value={pageConfig?.unit}
            style={{ width: '100%' }}
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
