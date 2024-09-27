// no-check
import './style.scss';
import React, { useMemo } from 'react';
import {
  dashboard,
  bitable,
  DashboardState,
  IConfig,
  SourceType,
} from '@lark-base-open/js-sdk';
import { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
// import { getTime } from './utils';
import { useConfig } from '../../hooks';
// import dayjs from 'dayjs';
import classnames from 'classnames';
import { useTranslation } from 'react-i18next';
import ProgressBarView from './components/ProgressBarView';
import ConfigPanel from './components/ConfigPanel';

let myChart: any = null; // echarts实例

/** 符合convertTimestamp的日期格式 */
// const titleDateReg = /\d{4}-\d{1,2}-\d{1,2}\s\d+:\d+:\d{1,2}/;

// const othersConfigKey: { key: string; title: string }[] = [];

// const defaultOthersConfig = ['showTitle'];
//  默认配置
const configDefault = {
  target: new Date().getTime(),
  color: '#3370ff',
  tableSourceSelected: '',
  dataRangeSelected: '',
  categoriesSelected: [],
  categoriesSelectedOtherConfig: [],
  // 单位
  unit: '',
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
    currentVal: '',
    percentage: '',
  });

  const [tableList, setTableList] = useState<any[]>([]);
  const [tableFileds, setTableFileds] = useState<any[]>([]);

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
    } else if (currentVal) {
      showCurrentVal = Math.max(targetVal / 20, currentVal);
    }

    // progress bar 宽度
    let barWidth = Math.min(60, (window.innerWidth / 187) * 10);
    barWidth = Math.max(10, barWidth);

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
            let isTime = false;
            if (
              categoriesSelectedKeys.find(
                (cItem: any) => cItem?.fieldId === key
              )?.fieldType === 5 &&
              filterFormValues[key]?.length
            ) {
              isTime = true;
              value = [
                new Date(filterFormValues[key][0]).getTime(),
                new Date(filterFormValues[key][1]).getTime(),
              ];
            } else {
              value = null;
            }
            if (value) {
              if (isTime) {
                if (
                  record.fields[key] < value[0] ||
                  record.fields[key] > value[1]
                ) {
                  isMatch = false;
                }
              } else if (record.fields[key] !== value) {
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
        (!pageConfigInfo?.targetValue || !pageConfigInfo?.currentValue)
      ) {
        currentValues.targetVal = '-';
        currentValues.currentVal = '-';
        currentValues.percentage = '-';
        setRenderData(currentValues);
        return;
      }
      // 设置目标值
      if (!pageConfigInfo?.targetValue) {
        currentValues.targetVal = '-';
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
        currentValues.targetVal = +(+computeValue(
          arr,
          pageConfigInfo?.targetValueComputed
        )).toFixed(+pageConfigInfo?.format || 0);
      }
      if (records.length) {
        // 设置当前值
        if (!pageConfigInfo?.currentValue) {
          currentValues.currentVal = '-';
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
        currentValues.currentVal = +(0).toFixed(+pageConfigInfo?.format || 0);
        currentValues.percentage = (0).toFixed(
          +pageConfigInfo?.percentageFormat || 0
        );
        setRenderData(currentValues);
        return;
      }

      // 设置百分比
      currentValues.percentage =
        +currentValues.currentVal && +currentValues.targetVal
          ? (
              ((currentValues.currentVal || 0) /
                (currentValues.targetVal || 0)) *
              100
            ).toFixed(+pageConfigInfo?.percentageFormat || 0)
          : '0';
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
          myChart={myChart}
          getData={getData}
          filterFormRef={filterFormRef}
          renderData={renderData}
          pageConfig={pageConfig}
          key={pageConfig.target}
          isConfig={isConfig}
        />
      </div>
      {isConfig ? (
        <ConfigPanel
          t={t}
          configDefault={configDefault}
          pageConfig={pageConfig}
          setPageConfig={setPageConfig}
          getTableRange={getTableRange}
          getCategories={getCategories}
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

// 展示端
// function ProgressBarView({
//   pageConfig,
//   isConfig,
//   availableUnits,
//   t,
//   filterFormRef,
//   getData,
//   renderData,
// }: IProgressBarView) {
//   const { targetVal, currentVal, percentage } = renderData;
//   const {
//     categoriesSelected,
//     categoriesSelectedOtherConfig,
//     targetFormat,
//     currentFormat,
//     format,
//     unit,
//   } = pageConfig;
//   let categoriesSelectedDatas: any = [];
//   let categoriesSelectedDatasShow: any = [];
//   // 获取选择器配置
//   (categoriesSelected || []).forEach((cItem: string) => {
//     const opt = JSON.parse(cItem);
//     const otherConfig = categoriesSelectedOtherConfig.find(
//       (oItem: any) => oItem?.fieldId === opt?.fieldId
//     );
//     if (otherConfig) {
//       opt.isHide = otherConfig?.isHide;
//       opt.defaultValue = otherConfig?.defaultValue;
//     }
//     if (!opt?.isHide) {
//       categoriesSelectedDatasShow.push(opt);
//     }
//     categoriesSelectedDatas.push(opt);
//   });

//   // 选择器宽度边界
//   const filterWidth = 550;

//   // 初始化表单值
//   let initValues: any = {};
//   categoriesSelectedDatas.forEach((opt: any) => {
//     initValues[opt.fieldId] = opt?.defaultValue
//       ? opt?.defaultValue
//       : opt?.fieldType === 5
//       ? []
//       : '';
//   });

//   // 获取字体大小
//   const getFontSize = () => {
//     let fontSizeNum = (window.innerWidth / 187) * 4;
//     fontSizeNum = Math.min(5, fontSizeNum);
//     fontSizeNum = Math.max(3, fontSizeNum);
//     return `${fontSizeNum}vw`;
//   };

//   const [fontSize, setFontSize] = useState(
//     dashboard.state === DashboardState.View ? getFontSize() : '2vw'
//   );
//   const [innerWidth, setInnerWidth] = useState(window.innerWidth);

//   const presets = [
//     {
//       text: '今天',
//       start: new Date(),
//       end: new Date(),
//     },
//     {
//       text: '最近7天',
//       start: new Date(new Date().valueOf() - 1000 * 3600 * 24 * 7),
//       end: new Date(),
//     },
//     {
//       text: '最近30天',
//       start: new Date(new Date().valueOf() - 1000 * 3600 * 24 * 30),
//       end: new Date(),
//     },
//     {
//       // 本月
//       text: '本月',
//       start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
//       end: new Date(),
//     },
//     // 本年
//     {
//       text: '本年',
//       start: new Date(new Date().getFullYear(), 0, 1),
//       end: new Date(),
//     },
//   ];

//   // 窗口变更 重新绘制
//   const resizeChart = () => {
//     if (
//       dashboard.state === DashboardState.Config ||
//       dashboard.state === DashboardState.Create
//     ) {
//       return;
//     }
//     setInnerWidth(window.innerWidth);
//     // progress bar 宽度
//     let barWidth = Math.min(60, (window.innerWidth / 187) * 10);
//     barWidth = Math.max(10, barWidth);
//     // 更新图表
//     myChart.setOption({
//       series: [
//         {
//           barWidth,
//         },
//         {
//           barWidth,
//         },
//       ],
//     });
//     myChart?.resize(true);
//     // 更新字体大小
//     setFontSize(getFontSize());
//   };

//   useEffect(() => {
//     window.addEventListener('resize', resizeChart);

//     return () => {
//       window.removeEventListener('resize', resizeChart);
//     };
//   }, []);
//   return (
//     <div className="progress-bar-view">
//       <div>
//         <div
//           style={{
//             display:
//               categoriesSelectedDatas.length > 0 &&
//               categoriesSelectedDatasShow.length
//                 ? 'block'
//                 : 'none',
//             marginBottom: '10px',
//           }}
//         >
//           <Form
//             key={`${JSON.stringify(initValues)}`}
//             ref={filterFormRef}
//             layout="horizontal"
//             initValues={initValues}
//             style={{ width: '100%' }}
//             onValueChange={(values) => {
//               console.log('values =>', values);
//               getData({
//                 filterFormValues: values,
//               });
//             }}
//           >
//             <Row
//               className={`${innerWidth < filterWidth ? 'line-one' : ''}`}
//               style={{
//                 width: '100%',
//               }}
//             >
//               {categoriesSelectedDatas.map((cItem: any) => {
//                 const { fieldType } = cItem;
//                 if (fieldType === 1) {
//                   return (
//                     <Col
//                       span={innerWidth < filterWidth ? 24 : 12}
//                       key={`filter-${cItem?.fieldId}`}
//                       style={{
//                         marginTop: innerWidth < filterWidth ? '5px' : '0',
//                       }}
//                     >
//                       <Form.Input
//                         field={cItem?.fieldId}
//                         label={cItem?.fieldName}
//                         // initValue={'mikeya'}
//                         // style={{ width: '90%' }}
//                         trigger="blur"
//                       />
//                     </Col>
//                   );
//                 } else if (fieldType === 5) {
//                   return (
//                     <Col
//                       className="filter-content"
//                       span={innerWidth < filterWidth ? 24 : 12}
//                       key={`filter-${cItem?.fieldId}`}
//                       style={{
//                         marginTop: innerWidth < filterWidth ? '5px' : '0px',
//                       }}
//                     >
//                       <Form.DatePicker
//                         // type="date"
//                         type="dateRange"
//                         presets={presets}
//                         insetInput
//                         onChangeWithDateFirst={false}
//                         field={cItem?.fieldId}
//                         label={cItem?.fieldName}
//                         style={{ width: '100%' }}
//                         format="yyyy/MM/dd"
//                         // onChange={(date: any, dataString: string) => {
//                         //   // console.log('date =>', date, dataString);
//                         //   // 设置表单值为 dataString
//                         //   filterFormRef.current.formApi.setValue(
//                         //     cItem?.fieldId,
//                         //     '1111'
//                         //   );
//                         // }}
//                         // initValue={new Date()}
//                         placeholder="请选择日期"
//                       />
//                       <div
//                         className="filter-content-actions"
//                         style={{
//                           paddingRight: innerWidth < filterWidth ? '0' : '16px',
//                         }}
//                       >
//                         <Tag
//                           size="small"
//                           color="light-blue"
//                           onClick={() => {
//                             filterFormRef.current.formApi.setValue(
//                               cItem?.fieldId,
//                               [new Date(), new Date()]
//                             );
//                           }}
//                         >
//                           今天
//                         </Tag>
//                         <Tag
//                           size="small"
//                           color="light-blue"
//                           onClick={() => {
//                             filterFormRef.current.formApi.setValue(
//                               cItem?.fieldId,
//                               [
//                                 new Date(
//                                   new Date().valueOf() - 1000 * 3600 * 24 * 7
//                                 ),
//                                 new Date(),
//                               ]
//                             );
//                           }}
//                         >
//                           最近7天
//                         </Tag>
//                         <Tag
//                           size="small"
//                           color="light-blue"
//                           onClick={() => {
//                             filterFormRef.current.formApi.setValue(
//                               cItem?.fieldId,
//                               [
//                                 new Date(
//                                   new Date().valueOf() - 1000 * 3600 * 24 * 30
//                                 ),
//                                 new Date(),
//                               ]
//                             );
//                           }}
//                         >
//                           最近30天
//                         </Tag>
//                         <Tag
//                           size="small"
//                           color="light-blue"
//                           onClick={() => {
//                             filterFormRef.current.formApi.setValue(
//                               cItem?.fieldId,
//                               [
//                                 new Date(
//                                   new Date().getFullYear(),
//                                   new Date().getMonth(),
//                                   1
//                                 ),
//                                 new Date(),
//                               ]
//                             );
//                           }}
//                         >
//                           本月
//                         </Tag>
//                         <Tag
//                           size="small"
//                           color="light-blue"
//                           onClick={() => {
//                             filterFormRef.current.formApi.setValue(
//                               cItem?.fieldId,
//                               [
//                                 new Date(new Date().getFullYear(), 0, 1),
//                                 new Date(),
//                               ]
//                             );
//                           }}
//                         >
//                           本年
//                         </Tag>
//                       </div>
//                     </Col>
//                   );
//                 }
//                 return '';
//               })}
//             </Row>
//           </Form>
//         </div>
//         <div
//           className="progress-info"
//           style={{
//             fontSize,
//           }}
//         >
//           <span>
//             <span
//               className="number"
//               style={{
//                 color: pageConfig.color,
//               }}
//             >
//               {!Number.isNaN(+currentVal) &&
//               targetVal !== '-' &&
//               percentage !== ''
//                 ? `${formatNumber(currentVal, currentFormat, format)}${unit}`
//                 : '-'}
//             </span>
//             <span className="line"></span>
//             <span className="number">
//               {!Number.isNaN(+targetVal) &&
//               targetVal !== '-' &&
//               percentage !== ''
//                 ? `${formatNumber(targetVal, targetFormat, format)}${unit}`
//                 : '-'}
//             </span>
//           </span>
//           <span className="number">{percentage || '-'}%</span>
//         </div>
//         <div
//           id="main"
//           style={{
//             width: '100%',
//             height: '40px',
//           }}
//         ></div>
//       </div>
//     </div>
//   );
// }
