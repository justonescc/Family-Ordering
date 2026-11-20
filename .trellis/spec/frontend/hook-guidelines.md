# Hook 约定

- 以 `use` 开头，文件与导出同名。
- 只封装**有状态/副作用**逻辑；纯计算放 `utils/`。
- 副作用必须清理（`useEffect` 返回清理函数）。

## 项目内既有 hook

- `useMeals()`：拉取餐次列表并暴露 `reload`。
- `usePolling(callback, intervalMs, active)`：`active` 为 false 时暂停；回调变化重置定时器；挂载即执行一次。

## 数据请求写法

```ts
const load = useCallback(async () => {
  try {
    setData(await api.xxx());
  } catch (error) {
    Toast.show({ content: (error as Error).message });
  }
}, [deps]);

useEffect(() => { void load(); }, [load]);
```

- 依赖数组写全（`react-hooks/exhaustive-deps` 为 warn）。
- 避免在渲染期调用 `Date.now()` / `Math.random()` 等 impure 函数；初始值用 `useState(() => ...)`。
