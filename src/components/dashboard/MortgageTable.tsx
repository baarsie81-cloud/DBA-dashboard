"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  Check,
  GripVertical,
} from "lucide-react";
import type { MortgagePhase as DbMortgagePhase } from "@/db/schema";
import { displayText, formatCurrency, formatDateNl } from "@/lib/format";
import { formatFeeProcessingMonth } from "@/lib/fee-processing-month";
import {
  DEFAULT_MORTGAGE_COLUMN_ORDER,
  MORTGAGE_COLUMN_META,
  normalizeMortgageColumnOrder,
  type MortgageColumnKey,
} from "@/lib/mortgage-column-order";
import {
  resetMortgageColumnOrderAction,
  saveMortgageColumnOrderAction,
} from "@/lib/mortgage-actions";
import {
  buildMortgageListHref,
  DEFAULT_DIRECTION,
  DEFAULT_LIST_PARAM_DEFAULTS,
  parseMortgageListParams,
  type MortgageSortField,
} from "@/lib/mortgage-list-params";
import { getMortgagePhasePageConfig } from "@/lib/mortgage-phase-config";
import { PHASE_OPTIONS } from "@/lib/mortgage-validation";
import type { MortgageDossier } from "@/lib/types";

type MortgageTableProps = {
  dossiers: MortgageDossier[];
  columnOrder: MortgageColumnKey[];
  hasActiveFilters?: boolean;
  emptyState?: string;
  onEdit?: (id: string) => void;
  onPhaseChange?: (id: string, phase: DbMortgagePhase) => Promise<void> | void;
};

function phaseValueFromLabel(label: string): DbMortgagePhase {
  return (
    PHASE_OPTIONS.find((option) => option.label === label)?.value ??
    "in_behandeling"
  );
}

function PhaseSelect({
  dossierId,
  phaseLabel,
  onPhaseChange,
}: {
  dossierId: string;
  phaseLabel: string;
  onPhaseChange?: (id: string, phase: DbMortgagePhase) => Promise<void> | void;
}) {
  const [pending, startTransition] = useTransition();
  const value = phaseValueFromLabel(phaseLabel);

  return (
    <select
      key={`${dossierId}-${value}`}
      aria-label="Fase"
      disabled={pending || !onPhaseChange}
      defaultValue={value}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      onChange={(event) => {
        event.stopPropagation();
        const next = event.target.value as DbMortgagePhase;
        if (!onPhaseChange || next === value) return;
        startTransition(async () => {
          await onPhaseChange(dossierId, next);
        });
      }}
      className="h-8 max-w-[150px] rounded-md border border-dba-border bg-dba-background px-2 text-[12px] font-medium text-dba-charcoal outline-none focus-visible:border-dba-green focus-visible:ring-2 focus-visible:ring-dba-green focus-visible:ring-offset-1 disabled:opacity-60"
    >
      {PHASE_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function ColumnHeader({
  columnKey,
  activeSort,
  activeDirection,
  onSort,
}: {
  columnKey: MortgageColumnKey;
  activeSort: MortgageSortField;
  activeDirection: "asc" | "desc";
  onSort: (field: MortgageSortField) => void;
}) {
  const meta = MORTGAGE_COLUMN_META[columnKey];
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: columnKey });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const sortField = meta.sortField;
  const isActive = sortField != null && activeSort === sortField;
  const Icon = !isActive
    ? ArrowDownUp
    : activeDirection === "asc"
      ? ArrowUp
      : ArrowDown;

  return (
    <th
      ref={setNodeRef}
      style={style}
      className={`px-4 py-3 text-[11px] font-semibold tracking-wide text-dba-muted uppercase ${
        meta.align === "right" ? "text-right" : "text-left"
      } ${isDragging ? "relative z-10 bg-[#f3f5f3] opacity-90 shadow-sm" : ""}`}
    >
      <div
        className={`inline-flex items-center gap-1 ${
          meta.align === "right" ? "justify-end" : ""
        }`}
      >
        <button
          type="button"
          className="inline-flex h-5 w-5 shrink-0 cursor-grab items-center justify-center rounded text-dba-border-strong transition-colors hover:bg-dba-background hover:text-dba-muted active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dba-green focus-visible:ring-offset-1"
          aria-label={`Versleep kolom ${meta.label}`}
          title="Kolom verplaatsen"
          {...attributes}
          {...listeners}
          onClick={(event) => event.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>

        {sortField ? (
          <button
            type="button"
            onClick={() => onSort(sortField)}
            className={`inline-flex items-center gap-1.5 rounded-md transition-colors hover:text-dba-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dba-green focus-visible:ring-offset-1 ${
              isActive ? "text-dba-charcoal" : ""
            }`}
            aria-label={`Sorteer op ${meta.label}`}
          >
            {meta.label}
            <Icon
              className={`h-3 w-3 ${isActive ? "text-dba-green" : "text-dba-border-strong"}`}
              strokeWidth={1.75}
              aria-hidden
            />
          </button>
        ) : (
          <span>{meta.label}</span>
        )}
      </div>
    </th>
  );
}

function renderColumnCell(
  columnKey: MortgageColumnKey,
  dossier: MortgageDossier,
  onPhaseChange?: (id: string, phase: DbMortgagePhase) => Promise<void> | void,
) {
  switch (columnKey) {
    case "customer_name":
      return (
        <td
          key={columnKey}
          className="px-4 py-3.5 font-medium whitespace-nowrap text-dba-charcoal"
        >
          <div className="flex flex-col gap-0.5">
            <span>{dossier.clientName}</span>
            {dossier.clientNameSecondary ? (
              <span className="text-[12px] font-normal text-dba-muted">
                {dossier.clientNameSecondary}
              </span>
            ) : null}
          </div>
        </td>
      );
    case "advisor":
      return (
        <td
          key={columnKey}
          className="px-4 py-3.5 whitespace-nowrap text-dba-charcoal"
        >
          {displayText(dossier.advisor)}
        </td>
      );
    case "lender":
      return (
        <td
          key={columnKey}
          className="px-4 py-3.5 whitespace-nowrap text-dba-charcoal"
        >
          {displayText(dossier.lender)}
        </td>
      );
    case "svn":
      return (
        <td
          key={columnKey}
          className="px-4 py-3.5 whitespace-nowrap text-dba-charcoal"
        >
          {dossier.svn ? (
            <Check
              className="h-4 w-4 text-dba-dark-green"
              aria-label="SVN"
              strokeWidth={2.5}
            />
          ) : (
            <span className="text-dba-muted">—</span>
          )}
        </td>
      );
    case "principal_amount":
      return (
        <td
          key={columnKey}
          className="px-4 py-3.5 text-right font-medium whitespace-nowrap tabular-nums text-dba-charcoal"
        >
          {formatCurrency(dossier.principal)}
        </td>
      );
    case "application_date":
      return (
        <td
          key={columnKey}
          className="px-4 py-3.5 whitespace-nowrap tabular-nums text-dba-charcoal"
        >
          {formatDateNl(dossier.applicationDate)}
        </td>
      );
    case "financing_condition_date":
      return (
        <td
          key={columnKey}
          className="px-4 py-3.5 whitespace-nowrap tabular-nums text-dba-charcoal"
        >
          {formatDateNl(dossier.conditionalDate)}
        </td>
      );
    case "guarantee_date":
      return (
        <td
          key={columnKey}
          className="px-4 py-3.5 whitespace-nowrap tabular-nums text-dba-charcoal"
        >
          {formatDateNl(dossier.guaranteeDate)}
        </td>
      );
    case "bank_guarantee":
      return (
        <td
          key={columnKey}
          className="px-4 py-3.5 whitespace-nowrap text-dba-charcoal"
        >
          {displayText(dossier.bankGuarantee)}
        </td>
      );
    case "passing_date":
      return (
        <td
          key={columnKey}
          className="px-4 py-3.5 whitespace-nowrap tabular-nums text-dba-charcoal"
        >
          {formatDateNl(dossier.closingDate)}
        </td>
      );
    case "ready_for_passing":
      return (
        <td
          key={columnKey}
          className="px-4 py-3.5 whitespace-nowrap text-dba-charcoal"
        >
          {dossier.readyForPassing ? (
            <Check
              className="h-4 w-4 text-dba-dark-green"
              aria-label="Passeren"
              strokeWidth={2.5}
            />
          ) : (
            <span className="text-dba-muted">—</span>
          )}
        </td>
      );
    case "fee_processing_date":
      return (
        <td
          key={columnKey}
          className="px-4 py-3.5 whitespace-nowrap text-dba-charcoal"
        >
          {formatFeeProcessingMonth(dossier.feeProcessingDate)}
        </td>
      );
    case "phase":
      return (
        <td key={columnKey} className="px-4 py-3.5 whitespace-nowrap">
          <PhaseSelect
            dossierId={dossier.id}
            phaseLabel={dossier.phase}
            onPhaseChange={onPhaseChange}
          />
        </td>
      );
    default:
      return null;
  }
}

export function MortgageTable({
  dossiers,
  columnOrder: initialColumnOrder,
  hasActiveFilters = false,
  emptyState = "Geen dossiers gevonden.",
  onEdit,
  onPhaseChange,
}: MortgageTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [savingOrder, startSaveTransition] = useTransition();
  const listDefaults = useMemo(() => {
    const config = getMortgagePhasePageConfig(pathname);
    return config
      ? {
          sort: config.defaultSort,
          direction: config.defaultDirection,
        }
      : DEFAULT_LIST_PARAM_DEFAULTS;
  }, [pathname]);
  const filters = parseMortgageListParams(searchParams, listDefaults);
  const total = dossiers.length;

  const normalizedInitial = useMemo(
    () => normalizeMortgageColumnOrder(initialColumnOrder),
    [initialColumnOrder],
  );
  const [columnOrder, setColumnOrder] =
    useState<MortgageColumnKey[]>(normalizedInitial);
  const [orderError, setOrderError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleSort = (field: MortgageSortField) => {
    const nextDirection =
      filters.sort === field
        ? filters.direction === "asc"
          ? "desc"
          : "asc"
        : DEFAULT_DIRECTION;

    const href = buildMortgageListHref(
      pathname,
      searchParams,
      {
        sort:
          field === listDefaults.sort &&
          nextDirection === listDefaults.direction
            ? null
            : field,
        direction:
          field === listDefaults.sort &&
          nextDirection === listDefaults.direction
            ? null
            : nextDirection,
      },
      listDefaults,
    );

    startTransition(() => {
      router.push(href);
    });
  };

  const persistOrder = (next: MortgageColumnKey[]) => {
    setOrderError(null);
    startSaveTransition(async () => {
      const result = await saveMortgageColumnOrderAction(next);
      if (!result.ok) {
        setOrderError(
          result.error ??
            "Kolomvolgorde opslaan is niet gelukt. Probeer het opnieuw.",
        );
        setColumnOrder(normalizedInitial);
        return;
      }
      if (result.order) {
        setColumnOrder(result.order);
      }
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = columnOrder.indexOf(active.id as MortgageColumnKey);
    const newIndex = columnOrder.indexOf(over.id as MortgageColumnKey);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(columnOrder, oldIndex, newIndex);
    setColumnOrder(next);
    persistOrder(next);
  };

  const handleResetOrder = () => {
    const next = [...DEFAULT_MORTGAGE_COLUMN_ORDER];
    setColumnOrder(next);
    setOrderError(null);
    startSaveTransition(async () => {
      const result = await resetMortgageColumnOrderAction();
      if (!result.ok) {
        setOrderError(
          result.error ??
            "Standaardvolgorde herstellen is niet gelukt. Probeer het opnieuw.",
        );
        setColumnOrder(normalizedInitial);
        return;
      }
      setColumnOrder(result.order ?? next);
    });
  };

  const emptyMessage = hasActiveFilters
    ? "Geen dossiers gevonden met deze filters."
    : emptyState;

  const isDefaultOrder =
    columnOrder.length === DEFAULT_MORTGAGE_COLUMN_ORDER.length &&
    columnOrder.every(
      (key, index) => key === DEFAULT_MORTGAGE_COLUMN_ORDER[index],
    );

  return (
    <section className="overflow-hidden rounded-xl border border-dba-border bg-dba-surface shadow-[0_1px_2px_rgba(51,53,54,0.03)]">
      <div className="overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead className="border-b border-dba-border bg-[#fafbfa]">
              <tr>
                <SortableContext
                  items={columnOrder}
                  strategy={horizontalListSortingStrategy}
                >
                  {columnOrder.map((columnKey) => (
                    <ColumnHeader
                      key={columnKey}
                      columnKey={columnKey}
                      activeSort={filters.sort}
                      activeDirection={filters.direction}
                      onSort={handleSort}
                    />
                  ))}
                </SortableContext>
              </tr>
            </thead>
            <tbody>
              {total === 0 ? (
                <tr>
                  <td
                    colSpan={columnOrder.length}
                    className="px-4 py-12 text-center text-sm text-dba-muted"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                dossiers.map((dossier) => (
                  <tr
                    key={dossier.id}
                    tabIndex={onEdit ? 0 : undefined}
                    onClick={onEdit ? () => onEdit(dossier.id) : undefined}
                    onKeyDown={
                      onEdit
                        ? (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onEdit(dossier.id);
                            }
                          }
                        : undefined
                    }
                    className={`border-b border-dba-border last:border-b-0 hover:bg-[#fbfcfb] ${
                      onEdit
                        ? "cursor-pointer focus-visible:bg-[#f5f7f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-dba-green"
                        : ""
                    }`}
                  >
                    {columnOrder.map((columnKey) =>
                      renderColumnCell(columnKey, dossier, onPhaseChange),
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DndContext>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dba-border px-4 py-3">
        <p className="text-[13px] text-dba-muted">
          {total === 0
            ? "0 dossiers"
            : total <= 10
              ? `1 - ${total} van ${total} dossiers`
              : `${total} dossiers`}
          {savingOrder ? (
            <span className="ml-2 text-dba-muted/80">Volgorde opslaan…</span>
          ) : null}
        </p>

        <button
          type="button"
          onClick={handleResetOrder}
          disabled={savingOrder || isDefaultOrder}
          className="text-[12px] font-medium text-dba-muted transition-colors hover:text-dba-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dba-green focus-visible:ring-offset-1 disabled:cursor-default disabled:opacity-40"
        >
          Standaardvolgorde
        </button>
      </div>

      {orderError ? (
        <p
          role="alert"
          className="border-t border-dba-border px-4 py-2 text-[12px] text-red-700"
        >
          {orderError}
        </p>
      ) : null}
    </section>
  );
}
