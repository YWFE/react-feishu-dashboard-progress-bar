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
  Checkbox,
  Tag,
  DatePicker,
} from '@douyinfe/semi-ui';
import { Select } from 'antd';
import * as echarts from 'echarts';
import {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { Item } from '../../Item';
import { ColorPicker } from '../../ColorPicker';
import { IconConfigStroked } from '@douyinfe/semi-icons';
import { formatNumber } from './../contant';

interface IProgressBarView {
  myChart: any;
  pageConfig: any;
  isConfig: boolean;
  renderData: any;
  filterFormRef: any;
  getData: any;
  t: any;
}

function ProgressBarView(
  { myChart, pageConfig, filterFormRef, getData, renderData }: IProgressBarView,
  ref
) {
  const { targetVal, currentVal, percentage } = renderData;
  const {
    categoriesSelected,
    categoriesSelectedOtherConfig,
    targetFormat,
    currentFormat,
    format,
    unit,
    chartType = 'BAR',
  } = pageConfig;
  let categoriesSelectedDatas: any = [];
  let categoriesSelectedDatasShow: any = [];
  // 获取选择器配置
  (categoriesSelected || []).forEach((cItem: string) => {
    const opt = JSON.parse(cItem);
    const otherConfig = categoriesSelectedOtherConfig.find(
      (oItem: any) => oItem?.fieldId === opt?.fieldId
    );
    if (otherConfig) {
      opt.isHide = otherConfig?.isHide;
      opt.defaultValue = otherConfig?.defaultValue;
      opt.timeType =
        otherConfig?.timeType || (otherConfig?.fieldType === 5 ? 'date' : '');
    }
    if (!opt?.isHide) {
      categoriesSelectedDatasShow.push(opt);
    }
    categoriesSelectedDatas.push(opt);
  });

  // 选择器宽度边界
  const filterWidth = 550;

  // 初始化表单值
  let initValues: any = {};
  categoriesSelectedDatas.forEach((opt: any) => {
    initValues[opt.fieldId] = opt?.defaultValue
      ? opt?.defaultValue
      : opt?.fieldType === 5
      ? []
      : '';
  });

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
  const [innerHeight, setInnerHeight] = useState(window.innerHeight);

  useImperativeHandle(ref, () => ({
    drawChartHandle: () => {
      drawChart();
    },
  }));

  // 条形配置
  const barOption = (barWidth: any, opt: any) => {
    const { targetVal, showCurrentVal } = opt;
    return {
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
  };

  // 半圆配置
  const semiCircleOptin = (barWidth: any, opt: any) => {
    const { targetVal, showCurrentVal } = opt;
    return {
      series: [
        {
          type: 'pie',
          startAngle: 180,
          endAngle: 0,
          radius: ['80%', '100%'],
          avoidLabelOverlap: false,
          label: {
            show: false,
          },
          data: [
            {
              value: showCurrentVal,
              name: '已完成',
              itemStyle: {
                borderRadius: [10, 10, 10, 10], // 已完成部分设置圆角
              },
            },
            {
              value: 100 - showCurrentVal,
              name: '未完成',
              itemStyle: {
                borderRadius: [0, 10, 0, 10], // 已完成部分设置圆角
              },
            },
          ],
        },
      ],
      color: [pageConfig?.color, '#E0E0E0'],
    };
  };

  // 环形配置
  const ringOption = (barWidth: any, opt: any) => {
    const { targetVal, showCurrentVal } = opt;
    return {
      angleAxis: {
        max: targetVal, // 总数
        clockwise: false, // 逆时针
        // 隐藏刻度线
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
        splitLine: {
          show: false,
        },
      },
      radiusAxis: {
        type: 'category',
        // 隐藏刻度线
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
        splitLine: {
          show: false,
        },
      },
      polar: {
        center: ['50%', '50%'],
        radius: '100%', // 图形大小
      },
      series: [
        {
          type: 'bar',
          data: [
            {
              name: '',
              value: showCurrentVal,
              itemStyle: {
                normal: {
                  color: pageConfig?.color,
                },
              },
            },
          ],
          coordinateSystem: 'polar',
          roundCap: true,
          barWidth: (barWidth * 4) / 5,
          barGap: '-100%',
          z: 2,
        },
        {
          // 底色环
          type: 'bar',
          data: [
            {
              value: targetVal,
              itemStyle: {
                color: '#e0e0e0',
              },
            },
          ],
          coordinateSystem: 'polar',
          roundCap: true,
          barWidth: (barWidth * 4) / 5,
          barGap: '-100%',
          z: 1,
        },
      ],
    };
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

    let option = {};
    if (chartType === 'BAR') {
      option = barOption(barWidth, {
        targetVal,
        showCurrentVal,
      });
    } else if (chartType === 'CIRCLE') {
      option = semiCircleOptin(barWidth, {
        targetVal,
        showCurrentVal,
      });
    } else if (chartType === 'RING') {
      option = ringOption(barWidth, {
        targetVal,
        showCurrentVal,
      });
    }
    myChart.setOption(option, true);
    // myChart.setOption(option, true);
  };

  // 窗口变更 重新绘制
  const resizeChart = () => {
    if (
      dashboard.state === DashboardState.Config ||
      dashboard.state === DashboardState.Create
    ) {
      return;
    }
    setInnerWidth(window.innerWidth);
    setInnerHeight(window.innerHeight);
    // progress bar 宽度
    let barWidth = Math.min(60, (window.innerWidth / 187) * 10);
    barWidth = Math.max(10, barWidth);
    // 更新图表
    myChart.setOption({
      series: [
        {
          barWidth,
        },
        {
          barWidth,
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
  return (
    <div className="progress-bar-view">
      <div>
        <div
          style={{
            display:
              categoriesSelectedDatas.length > 0 &&
              categoriesSelectedDatasShow.length
                ? 'block'
                : 'none',
            marginBottom: '10px',
          }}
        >
          <Form
            key={`${JSON.stringify(initValues)}`}
            ref={filterFormRef}
            layout="horizontal"
            initValues={initValues}
            style={{ width: '100%' }}
            onValueChange={(values) => {
              getData({
                filterFormValues: values,
              });
            }}
          >
            <Row
              className={`${innerWidth < filterWidth ? 'line-one' : ''}`}
              style={{
                width: '100%',
              }}
            >
              {categoriesSelectedDatas.map((cItem: any) => {
                const { fieldType } = cItem;
                if (cItem.isHide) {
                  return null;
                }
                if (fieldType === 1) {
                  return (
                    <Col
                      span={innerWidth < filterWidth ? 24 : 12}
                      key={`filter-${cItem?.fieldId}`}
                      style={{
                        marginTop: innerWidth < filterWidth ? '5px' : '0',
                      }}
                    >
                      <Form.Input
                        field={cItem?.fieldId}
                        label={cItem?.fieldName}
                        trigger="blur"
                      />
                    </Col>
                  );
                } else if (fieldType === 5) {
                  return (
                    <Col
                      className="filter-content"
                      span={innerWidth < filterWidth ? 24 : 12}
                      key={`filter-${cItem?.fieldId}`}
                      style={{
                        marginTop: innerWidth < filterWidth ? '5px' : '0px',
                      }}
                    >
                      <Form.DatePicker
                        // type="date"
                        type={cItem?.timeType || 'dateRange'}
                        // presets={presets}
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
                      {/* <div
                        className="filter-content-actions"
                        style={{
                          paddingRight: innerWidth < filterWidth ? '0' : '16px',
                        }}
                      >
                        <Tag
                          size="small"
                          color="light-blue"
                          onClick={() => {
                            filterFormRef.current.formApi.setValue(
                              cItem?.fieldId,
                              [new Date(), new Date()]
                            );
                          }}
                        >
                          今天
                        </Tag>
                        <Tag
                          size="small"
                          color="light-blue"
                          onClick={() => {
                            filterFormRef.current.formApi.setValue(
                              cItem?.fieldId,
                              [
                                new Date(
                                  new Date().valueOf() - 1000 * 3600 * 24 * 7
                                ),
                                new Date(),
                              ]
                            );
                          }}
                        >
                          最近7天
                        </Tag>
                        <Tag
                          size="small"
                          color="light-blue"
                          onClick={() => {
                            filterFormRef.current.formApi.setValue(
                              cItem?.fieldId,
                              [
                                new Date(
                                  new Date().valueOf() - 1000 * 3600 * 24 * 30
                                ),
                                new Date(),
                              ]
                            );
                          }}
                        >
                          最近30天
                        </Tag>
                        <Tag
                          size="small"
                          color="light-blue"
                          onClick={() => {
                            filterFormRef.current.formApi.setValue(
                              cItem?.fieldId,
                              [
                                new Date(
                                  new Date().getFullYear(),
                                  new Date().getMonth(),
                                  1
                                ),
                                new Date(),
                              ]
                            );
                          }}
                        >
                          本月
                        </Tag>
                        <Tag
                          size="small"
                          color="light-blue"
                          onClick={() => {
                            filterFormRef.current.formApi.setValue(
                              cItem?.fieldId,
                              [
                                new Date(new Date().getFullYear(), 0, 1),
                                new Date(),
                              ]
                            );
                          }}
                        >
                          本年
                        </Tag>
                      </div> */}
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
              {!Number.isNaN(+currentVal) &&
              targetVal !== '-' &&
              percentage !== ''
                ? `${formatNumber(currentVal, currentFormat, format)}${unit}`
                : '-'}
            </span>
            <span className="line"></span>
            <span className="number">
              {!Number.isNaN(+targetVal) &&
              targetVal !== '-' &&
              percentage !== ''
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
            // height: '40px',
            height:
              chartType === 'BAR'
                ? '40px'
                : chartType === 'CIRCLE'
                ? Math.min(innerHeight - 40, innerWidth / 2)
                : Math.min(innerHeight - 40, (innerWidth * 3) / 5),
          }}
        ></div>
      </div>
    </div>
  );
}

export default forwardRef(ProgressBarView);
