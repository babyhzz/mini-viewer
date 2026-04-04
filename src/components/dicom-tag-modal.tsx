"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { Alert, Empty, Input, Modal, Spin, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ReactNode } from "react";

import type { DicomImageNode, DicomTagNode, DicomTagResponse } from "@/types/dicom";

export interface DicomTagModalSource {
  id: string;
  label: string;
  image: DicomImageNode | null;
}

type DicomTagTableRow = Omit<DicomTagNode, "children"> & {
  searchText: string;
  children?: DicomTagTableRow[];
};

interface DicomTagModalProps {
  open: boolean;
  title: string;
  sources: DicomTagModalSource[];
  defaultSourceId?: string | null;
  onClose: () => void;
}

function buildSearchText(node: DicomTagNode) {
  return [
    node.tag,
    node.displayTag,
    node.name,
    node.keyword,
    node.vr,
    node.value,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function mapDicomTagRows(nodes: DicomTagNode[]): DicomTagTableRow[] {
  return nodes.map((node) => ({
    ...node,
    searchText: buildSearchText(node),
    children: node.children.length ? mapDicomTagRows(node.children) : undefined,
  }));
}

function filterDicomTagRows(
  rows: DicomTagTableRow[],
  query: string,
): DicomTagTableRow[] {
  if (!query) {
    return rows;
  }

  return rows.reduce<DicomTagTableRow[]>((filteredRows, row) => {
    const filteredChildren = filterDicomTagRows(row.children ?? [], query);
    const matches = row.searchText.includes(query);

    if (!matches && filteredChildren.length === 0) {
      return filteredRows;
    }

    filteredRows.push({
      ...row,
      children: filteredChildren.length ? filteredChildren : undefined,
    });
    return filteredRows;
  }, []);
}

function collectExpandedRowKeys(rows: DicomTagTableRow[]) {
  return rows.reduce<string[]>((keys, row) => {
    if (!row.children?.length) {
      return keys;
    }

    keys.push(row.id);
    keys.push(...collectExpandedRowKeys(row.children));
    return keys;
  }, []);
}

const DICOM_TAG_COLUMNS: ColumnsType<DicomTagTableRow> = [
  {
    title: "Tag",
    dataIndex: "displayTag",
    key: "tag",
    width: 132,
    render: (_, row) => (
      <span className="dicom-tag-table-tag">
        {row.nodeType === "item" ? row.displayTag : row.displayTag}
      </span>
    ),
  },
  {
    title: "名称",
    dataIndex: "name",
    key: "name",
    width: 220,
    render: (_, row) => (
      <div className="dicom-tag-table-name">
        <span>{row.name}</span>
        {row.keyword && row.keyword !== row.name.replace(/\s+/g, "") ? (
          <small>{row.keyword}</small>
        ) : null}
      </div>
    ),
  },
  {
    title: "VR",
    dataIndex: "vr",
    key: "vr",
    width: 88,
    render: (value: string) => <Tag className="dicom-tag-table-vr">{value}</Tag>,
  },
  {
    title: "值",
    dataIndex: "value",
    key: "value",
    render: (_, row) => (
      <div className="dicom-tag-table-value">
        {row.value ? row.value : <span className="dicom-tag-table-empty">-</span>}
      </div>
    ),
  },
];

interface DicomTagExpandIconProps {
  expandable: boolean;
  expanded: boolean;
  onExpand: (
    record: DicomTagTableRow,
    event: ReactMouseEvent<HTMLElement>,
  ) => void;
  record: DicomTagTableRow;
}

function renderDicomTagExpandIcon({
  expandable,
  expanded,
  onExpand,
  record,
}: DicomTagExpandIconProps) {
  if (!expandable) {
    return null;
  }

  return (
    <button
      type="button"
      className={`ant-table-row-expand-icon ${expanded ? "ant-table-row-expand-icon-expanded" : "ant-table-row-expand-icon-collapsed"}`}
      aria-label={expanded ? "收起" : "展开"}
      onClick={(event) => {
        onExpand(record, event);
      }}
    />
  );
}

function getDicomTagEmptyDescription(normalizedSearchValue: string) {
  if (normalizedSearchValue) {
    return "没有匹配到对应的 Tag";
  }

  return "当前图像没有可显示的 Tag";
}

function getDicomTagRowClassName(row: DicomTagTableRow) {
  if (row.nodeType === "item") {
    return "dicom-tag-row is-item";
  }

  if (row.vr === "SQ") {
    return "dicom-tag-row is-sequence";
  }

  return "dicom-tag-row";
}

export function DicomTagModal({
  open,
  title,
  sources,
  defaultSourceId = null,
  onClose,
}: DicomTagModalProps) {
  const cacheRef = useRef(new Map<string, DicomTagResponse>());
  const [activeSourceId, setActiveSourceId] = useState<string | null>(defaultSourceId);
  const [payload, setPayload] = useState<DicomTagResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextSourceId =
      (defaultSourceId &&
      sources.some((source) => source.id === defaultSourceId)
        ? defaultSourceId
        : null) ??
      sources[0]?.id ??
      null;

    setActiveSourceId((previous) => {
      if (previous && sources.some((source) => source.id === previous)) {
        return previous;
      }

      return nextSourceId;
    });
  }, [defaultSourceId, open, sources]);

  const activeSource =
    sources.find((source) => source.id === activeSourceId) ?? sources[0] ?? null;
  const activeFilePath = activeSource?.image?.filePath ?? null;

  useEffect(() => {
    if (!open) {
      setPayload(null);
      setLoading(false);
      setErrorMessage(null);
      setSearchValue("");
      setExpandedRowKeys([]);
      return;
    }

    if (!activeFilePath) {
      setPayload(null);
      setLoading(false);
      setErrorMessage(null);
      setExpandedRowKeys([]);
      return;
    }

    const cachedPayload = cacheRef.current.get(activeFilePath);

    if (cachedPayload) {
      setPayload(cachedPayload);
      setLoading(false);
      setErrorMessage(null);
      setExpandedRowKeys([]);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const filePath = activeFilePath;

    async function loadDicomTags() {
      try {
        setLoading(true);
        setErrorMessage(null);

        const response = await fetch(
          `/api/dicom-tags?path=${encodeURIComponent(filePath)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error("加载 DICOM Tag 失败");
        }

        const nextPayload = (await response.json()) as DicomTagResponse;

        if (cancelled) {
          return;
        }

        cacheRef.current.set(filePath, nextPayload);
        setPayload(nextPayload);
        setExpandedRowKeys([]);
      } catch (error) {
        if (controller.signal.aborted || cancelled) {
          return;
        }

        console.error("Failed to load DICOM tags", error);
        setPayload(null);
        setErrorMessage("当前图像的 DICOM Tag 读取失败，请稍后重试。");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDicomTags();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [activeFilePath, open]);

  const tableRows = useMemo(
    () => mapDicomTagRows(payload?.tags ?? []),
    [payload],
  );
  const normalizedSearchValue = searchValue.trim().toLowerCase();
  const filteredRows = useMemo(
    () => filterDicomTagRows(tableRows, normalizedSearchValue),
    [normalizedSearchValue, tableRows],
  );
  const searchExpandedRowKeys = useMemo(
    () =>
      normalizedSearchValue ? collectExpandedRowKeys(filteredRows) : expandedRowKeys,
    [expandedRowKeys, filteredRows, normalizedSearchValue],
  );
  let content: ReactNode;

  if (loading) {
    content = (
      <div className="dicom-tag-loading">
        <Spin size="large" />
      </div>
    );
  } else if (activeSource?.image) {
    content = (
      <Table<DicomTagTableRow>
        size="small"
        pagination={false}
        columns={DICOM_TAG_COLUMNS}
        dataSource={filteredRows}
        rowKey="id"
        className="dicom-tag-table"
        data-testid="dicom-tag-table"
        childrenColumnName="children"
        expandable={{
          expandedRowKeys: searchExpandedRowKeys,
          rowExpandable: (row) =>
            Boolean(row.children?.length) &&
            (row.vr === "SQ" || row.nodeType === "item"),
          expandIcon: renderDicomTagExpandIcon,
          onExpandedRowsChange: (nextExpandedRowKeys) => {
            setExpandedRowKeys(nextExpandedRowKeys as string[]);
          },
        }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={getDicomTagEmptyDescription(normalizedSearchValue)}
            />
          ),
        }}
        rowClassName={getDicomTagRowClassName}
        scroll={{
          y: 560,
        }}
      />
    );
  } else {
    content = (
      <div className="dicom-tag-empty">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="当前视口没有可读取的 DICOM 图像"
        />
      </div>
    );
  }

  return (
    <Modal
      open={open}
      width={1080}
      footer={null}
      destroyOnHidden={false}
      onCancel={onClose}
      title={title}
      rootClassName="dicom-tag-modal"
    >
      <div className="dicom-tag-modal-body" data-testid="dicom-tag-modal">
        <div className="dicom-tag-toolbar">
          <Input.Search
            allowClear
            value={searchValue}
            placeholder="搜索 Tag 编号、名称或关键字"
            className="dicom-tag-search"
            data-testid="dicom-tag-search"
            onChange={(event) => {
              setSearchValue(event.target.value);
            }}
          />
        </div>

        {errorMessage ? (
          <Alert
            showIcon
            type="error"
            message={errorMessage}
            className="dicom-tag-alert"
          />
        ) : null}

        {content}
      </div>
    </Modal>
  );
}
