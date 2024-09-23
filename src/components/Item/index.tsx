import './style.scss';

export function Item(props: any) {
  if (!props.children && !props.label) {
    return null;
  }

  return (
    <div className="form-item">
      {props.label ? <div className="label">{props.label}</div> : null}
      {props.children ? <div>{props.children}</div> : null}
    </div>
  );
}
