import { FieldType, ICategory } from '@lark-base-open/js-sdk';
import { Select, Form, Button } from 'antd';
import { PlusOutlined, MinusOutlined } from '@ant-design/icons';

export function Indicator({ fieldList }: { fieldList: ICategory[] }) {
  return (
    <div style={{ position: 'relative' }}>
      <Form.List name="indicators">
        {(fields, { add, remove }) => (
          <>
            {fields.map((field, index) => {
              return (
                <Form.Item label={`指标${index + 1}（平均值）`} {...field}>
                  <Select
                    style={{ width: 200 }}
                    options={fieldList.map((item) => ({
                      label: item.fieldName,
                      value: item.fieldId,
                    }))}
                  />
                </Form.Item>
              );
            })}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Button
                onClick={() => {
                  add();
                }}
              >
                添加指标
                <PlusOutlined />
              </Button>
              <Button
                onClick={() => {
                  remove(fields.length - 1);
                }}
              >
                删除指标
                <MinusOutlined />
              </Button>
            </div>
          </>
        )}
      </Form.List>
    </div>
  );
}
