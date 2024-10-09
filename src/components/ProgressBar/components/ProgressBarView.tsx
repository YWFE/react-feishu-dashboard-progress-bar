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
import { useState, useEffect, useRef } from 'react';
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

function ProgressBarView({
  myChart,
  pageConfig,
  filterFormRef,
  getData,
  renderData,
}: IProgressBarView) {
  const { targetVal, currentVal, percentage } = renderData;
  const {
    categoriesSelected,
    categoriesSelectedOtherConfig,
    targetFormat,
    currentFormat,
    format,
    unit,
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

  // 窗口变更 重新绘制
  const resizeChart = () => {
    if (
      dashboard.state === DashboardState.Config ||
      dashboard.state === DashboardState.Create
    ) {
      return;
    }
    setInnerWidth(window.innerWidth);
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
            height: '40px',
          }}
        ></div>
      </div>
    </div>
  );
}

export default ProgressBarView;
