import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";
import dayjs from "dayjs";
import { useMemo } from "react";
import sourceData from "./source-data.json";
import type { SourceDataType, TableDataType } from "./types";

/**
 * Example of how a tableData object should be structured.
 *
 * Each `row` object has the following properties:
 * @prop {string} person - The full name of the employee.
 * @prop {number} past12Months - The value for the past 12 months.
 * @prop {number} y2d - The year-to-date value.
 * @prop {number} may - The value for May.
 * @prop {number} june - The value for June.
 * @prop {number} july - The value for July.
 * @prop {number} netEarningsPrevMonth - The net earnings for the previous month.
 */

const MONTH_ORDER = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const deduceLastThreeMonths = (): [string, string, string] => {
  for (const row of sourceData as unknown as SourceDataType[]) {
    const list =
      row.employees?.workforceUtilisation?.lastThreeMonthsIndividually ??
      row.externals?.workforceUtilisation?.lastThreeMonthsIndividually;

    if (list && list.length >= 3) {
      const unique = [...new Set(list.map((m) => m.month))];
      const sorted = unique.sort(
        (a, b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b)
      );
      const last3 = sorted.slice(-3);
      if (last3.length === 3) {
        return [last3[0], last3[1], last3[2]] as [string, string, string];
      }
    }
  }

  const fallback = Array.from({ length: 3 }, (_, i) =>
    dayjs().subtract(3 - i, "month").format("MMMM")
  );
  return [fallback[0], fallback[1], fallback[2]] as [string, string, string];
};

const [MONTH_A, MONTH_B, MONTH_C] = deduceLastThreeMonths();

const formatPercent = (raw?: string | number): string => {
  if (raw === undefined || raw === null || raw === "" || isNaN(Number(raw)))
    return "–";
  const val = typeof raw === "string" ? Number(raw) : raw;
  return `${(val * 100).toFixed(0)}%`;
};

const formatCurrency = (raw?: string | number): string => {
  if (raw === undefined || raw === null || raw === "" || isNaN(Number(raw)))
    return "–";
  let val = Number(raw);
  if (Math.abs(val) < 1e-6) val = 0;
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(val);
};

const buildTableData = (): TableDataType[] => {
  const prevMonthIso = dayjs().subtract(1, "month").format("YYYY-MM");

  return (sourceData as unknown as SourceDataType[])
    .filter((entry) => entry.employees || entry.externals)
    .filter((entry) => {
      const status = entry.employees?.status || entry.externals?.status;
      return status?.toLowerCase() === "active";
    })
    .map((entry) => {
      const person = entry.employees || entry.externals!;
      const name =
        person.name || `${person.firstname} ${person.lastname ?? ""}`.trim();

      const util = person.workforceUtilisation;
      const past12 = formatPercent(util?.utilisationRateLastTwelveMonths);
      const ytd = formatPercent(util?.utilisationRateYearToDate);

      const pickUtil = (label: string): string => {
        const rec = util?.lastThreeMonthsIndividually?.find(
          (m) => m.month.toLowerCase() === label.toLowerCase()
        );
        return rec ? formatPercent(rec.utilisationRate) : "–";
      };

      const utilA = pickUtil(MONTH_A);
      const utilB = pickUtil(MONTH_B);
      const utilC = pickUtil(MONTH_C);

      let netRaw = 0;
      if (entry.employees) {
        const list = entry.employees.costsByMonth?.potentialEarningsByMonth ?? [];
        const rec = list.find((l) => l.month === prevMonthIso);
        netRaw = rec ? Number(rec.costs) : 0;
      } else if (entry.externals) {
        const list = entry.externals.costsByMonth?.costsByMonth ?? [];
        const rec = list.find((l) => l.month === prevMonthIso);
        netRaw = rec ? -Number(rec.costs) : 0;
      }
      if (Math.abs(netRaw) < 1e-6) netRaw = 0;
      const netPrev = formatCurrency(netRaw);

      return {
        person: name,
        past12Months: past12,
        y2d: ytd,
        may: utilA,
        june: utilB,
        july: utilC,
        netEarningsPrevMonth: netPrev,
      } satisfies TableDataType;
    });
};

const Example = () => {
  const data = useMemo(() => buildTableData(), []);

  const columns = useMemo<MRT_ColumnDef<TableDataType>[]>(
    () => [
      { accessorKey: "person", header: "Person", size: 260 },
      { accessorKey: "past12Months", header: "Past 12 Months", size: 120 },
      { accessorKey: "y2d", header: "Y2D", size: 80 },
      { accessorKey: "may", header: MONTH_A, size: 80 },
      { accessorKey: "june", header: MONTH_B, size: 80 },
      { accessorKey: "july", header: MONTH_C, size: 80 },
      {
        accessorKey: "netEarningsPrevMonth",
        header: "Net Earnings Prev Month",
        size: 200,
      },
    ],
    []
  );

  const table = useMaterialReactTable({
    columns,
    data,
    columnResizeMode: "onChange",
    enableColumnResizing: true,
  });

  return <MaterialReactTable table={table} />;
};

export default Example;
