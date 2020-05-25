package ru.neoflex.nfcore.dataset.impl

import org.slf4j.Logger
import org.slf4j.LoggerFactory
import ru.neoflex.nfcore.application.AppModule
import ru.neoflex.nfcore.application.ApplicationFactory
import ru.neoflex.nfcore.application.impl.AppModuleInit
import ru.neoflex.nfcore.application.impl.ApplicationInit
import ru.neoflex.nfcore.application.impl.GlobalSettingsInit
import ru.neoflex.nfcore.application.impl.YearBookInit
import ru.neoflex.nfcore.application.impl.GradientStyleInit
import ru.neoflex.nfcore.application.impl.TypographyStyleInit
import ru.neoflex.nfcore.notification.Periodicity
import ru.neoflex.nfcore.notification.impl.NotificationInit
import ru.neoflex.nfcore.notification.impl.NotificationStatusInit

class DatasetPackageInit {
    private static final Logger logger = LoggerFactory.getLogger(DatasetPackageInit.class);

    {
        /*DatasetPackage*/
        JdbcDriverInit.createDriver("JdbcDriverPostgresqlTest", "org.postgresql.Driver")
        JdbcConnectionInit.createConnection("JdbcConnectionPostgresqlTest", "JdbcDriverPostgresqlTest", "jdbc:postgresql://cloud.neoflex.ru:5432/teneodev", "postgres", "ne0f1ex")

        def dqcRunTest = ApplicationFactory.eINSTANCE.createButton()
        dqcRunTest.name = "showRun"
        dqcRunTest.setButtonSubmit(true)
        def dqcShowTests = ApplicationFactory.eINSTANCE.createHref()
        dqcShowTests.name = "showTest"
        dqcShowTests.label = "перейти"


        try {
            JdbcDatasetInit.createJdbcDatasetInit("JdbcDatasetTest", "sse_workspace","public", "JdbcConnectionPostgresqlTest")
            JdbcDatasetInit.loadAllColumnsJdbcDatasetInit("JdbcDatasetTest")
            DatasetComponentInit.createDatasetComponent("DatasetGridTest", "JdbcDatasetTest")
            DatasetComponentInit.createAllColumn("DatasetGridTest")
            DatasetComponentInit.createServerFilters("DatasetGridTest", "JdbcDatasetTest")

            JdbcDatasetInit.createJdbcDatasetInit("JdbcDatasetTestAAA", "aaa_test", "public", "JdbcConnectionPostgresqlTest")
            JdbcDatasetInit.loadAllColumnsJdbcDatasetInit("JdbcDatasetTestAAA")
            DatasetComponentInit.createDatasetComponent("DatasetGridTestAAA", "JdbcDatasetTestAAA")
            DatasetComponentInit.createAllColumn("DatasetGridTestAAA")

            /*NRDEMO*/
            JdbcDriverInit.createDriver("JdbcDriverNRDemo", "oracle.jdbc.driver.OracleDriver")
            JdbcConnectionInit.createConnection("JdbcConnectionNRDemo", "JdbcDriverNRDemo", "jdbc:oracle:thin:@(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=nrdemo.neoflex.ru)(PORT=1521))(CONNECT_DATA=(SERVER=DEDICATED)(SERVICE_NAME=orcl.neoflex.ru))) ", "system", "Ne0f1ex")

            /*MAIN*/
            String query =
                    "select row_number,\n" +
                    "       f110_code,\n" +
                    "       amount_rub,\n" +
                    "       amount_cur,\n" +
                    "       section_number\n" +
                    "  from table(data_representation.rep_f110.GetF110Apex(\n" +
                    "         i_AppUser         => 0,\n" +
                    "         i_OnDate          => :REPORT_DATE - 1,\n" +
                    "         i_BranchCode      => nrsettings.settings_tools.getParamChrValue('HEAD_OFFICE_BRANCH_CODE'),\n" +
                    "         i_ReportPrecision => :REPORT_PRECISION,\n" +
                    "         i_SpodDate        => null\n" +
                    "       ))\n"
            String querySection1 = query + " where section_number = 1"
            String querySection2 = query + " where section_number = 2"
            String querySection3 = query + " where section_number = 3"
            String querySection4 = query + " where section_number = 4"

            JdbcDatasetInit.createJdbcDatasetQueryInit("jdbcNRDemoSection1","dm_f110_aggregated_f","dma",querySection1,"JdbcConnectionNRDemo")
            JdbcDatasetInit.loadAllColumnsJdbcDatasetInit("jdbcNRDemoSection1")
            DatasetComponentInit.createDatasetComponent("DatasetNRDemoSection1", "jdbcNRDemoSection1")
            DatasetComponentInit.createAllColumnNRDemoMain("DatasetNRDemoSection1")

            JdbcDatasetInit.createJdbcDatasetQueryInit("jdbcNRDemoSection2","dm_f110_aggregated_f","dma",querySection2,"JdbcConnectionNRDemo")
            JdbcDatasetInit.loadAllColumnsJdbcDatasetInit("jdbcNRDemoSection2")
            DatasetComponentInit.createDatasetComponent("DatasetNRDemoSection2", "jdbcNRDemoSection2")
            DatasetComponentInit.createAllColumnNRDemoMain("DatasetNRDemoSection2")

            JdbcDatasetInit.createJdbcDatasetQueryInit("jdbcNRDemoSection3","dm_f110_aggregated_f","dma",querySection3,"JdbcConnectionNRDemo")
            JdbcDatasetInit.loadAllColumnsJdbcDatasetInit("jdbcNRDemoSection3")
            DatasetComponentInit.createDatasetComponent("DatasetNRDemoSection3", "jdbcNRDemoSection3")
            DatasetComponentInit.createAllColumnNRDemoMain("DatasetNRDemoSection3")

            JdbcDatasetInit.createJdbcDatasetQueryInit("jdbcNRDemoSection4","dm_f110_aggregated_f","dma",querySection4,"JdbcConnectionNRDemo")
            JdbcDatasetInit.loadAllColumnsJdbcDatasetInit("jdbcNRDemoSection4")
            DatasetComponentInit.createDatasetComponent("DatasetNRDemoSection4", "jdbcNRDemoSection4")
            DatasetComponentInit.createAllColumnNRDemoMain("DatasetNRDemoSection4")

            /*DETAIL*/
            String detailQuery = "select section_number,\n" +
                    "       row_number,\n" +
                    "       f110_code,\n" +
                    "       account_number,\n" +
                    "       f102_symbol,\n" +
                    "       amount_rub,\n" +
                    "       account_name,\n" +
                    "       account_amount_rub,\n" +
                    "       option_premium_amount,\n" +
                    "       customer_name,\n" +
                    "       party_type,\n" +
                    "       is_co,\n" +
                    "       is_resident,\n" +
                    "       agreement_number,\n" +
                    "       active_reserve_type\n" +
                    "  from table(data_representation.rep_f110_detail.GetF110DetailApex(\n" +
                    "         i_AppUser         => 0,\n" +
                    "         i_OnDate          => NULL,\n" +
                    "         i_BranchCode      => '000001',\n" +
                    "         i_SectionNumber   => null,\n" +
                    "         i_F110Code        => null\n" +
                    "       ))\n" +
                    " where (NULL like '%'||to_char(section_number)||'%' or NULL is null) \n" +
                    "   and (NULL like '%'||to_char(f110_code)||'%' or NULL is null) "

            String bindQuery = "select section_number,\n" +
                    "       row_number,\n" +
                    "       f110_code,\n" +
                    "       account_number,\n" +
                    "       f102_symbol,\n" +
                    "       amount_rub,\n" +
                    "       account_name,\n" +
                    "       account_amount_rub,\n" +
                    "       option_premium_amount,\n" +
                    "       customer_name,\n" +
                    "       party_type,\n" +
                    "       is_co,\n" +
                    "       is_resident,\n" +
                    "       agreement_number,\n" +
                    "       active_reserve_type\n" +
                    "  from table(data_representation.rep_f110_detail.GetF110DetailApex(\n" +
                    "         i_AppUser         => 0,\n" +
                    "         i_OnDate          => :REPORT_DATE,\n" +
                    "         i_BranchCode      => '000001',\n" +
                    "         i_SectionNumber   => null,\n" +
                    "         i_F110Code        => null\n" +
                    "       ))\n" +
                    " where (:SECTIONS like '%'||to_char(section_number)||'%' or :SECTIONS is null) \n" +
                    "   and (:CODES like '%'||to_char(f110_code)||'%' or :CODES is null) "

            JdbcDatasetInit.createJdbcDatasetQueryTypeInit("jdbcNRDemoDetail",detailQuery,"JdbcConnectionNRDemo")
            JdbcDatasetInit.loadAllColumnsJdbcDatasetInit("jdbcNRDemoDetail")
            JdbcDatasetInit.updateJdbcDataset("jdbcNRDemoDetail", bindQuery)

            DatasetComponentInit.createDatasetComponent("DatasetNRDemoDetail", "jdbcNRDemoDetail")
            //TODO настраивать ширину столбцов в момент создания
            DatasetComponentInit.createAllColumnNRDemoDetail("DatasetNRDemoDetail")


            /*CalcMart*/
            String calcedMarts = "with\n" +
                    "wt_calc_type as\n" +
                    "(\n" +
                    "  select --+ materialize\n" +
                    "         calc_type,\n" +
                    "         underwood_name,\n" +
                    "         row_number() over (partition by underwood_name order by actual_end_date desc, actual_end_date desc, row_change_time desc) as rn\n" +
                    "    from nrapp.ref_calc_type\n" +
                    "   where apex_application_id =  '11100'\n" +
                    "),\n" +
                    "wt_event_job as\n" +
                    "(\n" +
                    "  select --+ materialize\n" +
                    "         t.partition_key,\n" +
                    "         to_char(t.begin_date, 'dd.mm.yyyy hh24:mi:ss') as begin_date,\n" +
                    "         to_char(t.end_date, 'dd.mm.yyyy hh24:mi:ss') as end_date,\n" +
                    "         t.event_result_code,\n" +
                    "         t.event_result_message,\n" +
                    "         t.object_name,\n" +
                    "         t.record_id,\n" +
                    "         t.event_parameters_list\n" +
                    "    from nrlogs.lg_event t\n" +
                    "    join nrsettings.st_event_type et\n" +
                    "      on et.event_type_id = t.event_type_id\n" +
                    "    join wt_calc_type wt\n" +
                    "      on t.partition_key = wt.underwood_name\n" +
                    "   where 1=1\n" +
                    "     and et.code = 'CREATE_JOB'\n" +
                    ")\n" +
                    "select ej.record_id,\n" +
                    "       ej.event_parameters_list,\n" +
                    "       nvl(ct.calc_type,ej.partition_key) as partition_key,\n" +
                    "       ej.begin_date,\n" +
                    "       ej.end_date,\n" +
                    "       case\n" +
                    "         when ej.event_result_code = 0\n" +
                    "              and ej.end_date is not null\n" +
                    "           then 'Расчет успешно завершен'\n" +
                    "         when ej.event_result_code != 0\n" +
                    "              and ej.end_date is not null\n" +
                    "         then 'При расчете возникла ошибка: '||ej.event_result_message\n" +
                    "           when wj.job_name is not null\n" +
                    "         then 'Расчет выполняется...'\n" +
                    "       end as status\n" +
                    "  from wt_event_job ej\n" +
                    "  left\n" +
                    "  join wt_calc_type ct\n" +
                    "    on ct.underwood_name = ej.partition_key\n" +
                    "   and ct.rn = 1\n" +
                    "  left\n" +
                    "  join nrcore.vw_working_job wj\n" +
                    "    on ej.object_name = wj.job_name\n" +
                    " order by\n" +
                    "       ej.record_id desc"

            JdbcDatasetInit.createJdbcDatasetQueryTypeInit("jdbcNRDemoCalcMart",calcedMarts,"JdbcConnectionNRDemo")
            JdbcDatasetInit.loadAllColumnsJdbcDatasetInit("jdbcNRDemoCalcMart")
            DatasetComponentInit.createDatasetComponent("DatasetNRDemoCalcMart", "jdbcNRDemoCalcMart")
            DatasetComponentInit.createAllColumnNRDemoCalcMart("DatasetNRDemoCalcMart")

            String kliko = "SELECT file_id,\n" +
                    "       TO_DATE(max(decode(parameter_name,'I_ONDATE',parameter_value)),'dd.mm.yyyy')+1 AS on_date,\n" +
                    "       TO_DATE(nvl(max(decode(parameter_name,'I_SPODDATE',parameter_value)),max(decode(parameter_name,'I_ONDATE',parameter_value))),'dd.mm.yyyy')+1 as spod_date,\n" +
                    "       nvl2(max(decode(parameter_name,'I_SPODDATE',parameter_value)), 'Да', 'Нет') as include_spod,\n" +
                    "       MAX(DECODE(parameter_name,'I_BRANCH_RK',parameter_value)) AS branch_rk,\n" +
                    "       nvl(MAX(br.branch_code),'Сводный') as branch_code,\n" +
                    "       decode(MAX(DECODE(parameter_name,'I_FORM_TYPE',parameter_value)),\n" +
                    "                 'D','Дневная',\n" +
                    "                 'M','Месячная',\n" +
                    "                 'Q','Квартальная',\n" +
                    "                 'H','Полугодовая',\n" +
                    "                 'Месячная'\n" +
                    "       )  AS  form_type,\n" +
                    "       replace(file_name, 'nrcore.data_export_util','http://nrdemo.neoflex.ru:8080/apex/nrcore.data_export_util') as file_name,\n" +
                    "       file_status,\n" +
                    "       date_begin,\n" +
                    "       date_end,\n" +
                    "       file_size,\n" +
                    "       message,\n" +
                    "       MAX(DECODE(parameter_name,'I_STATUS_CB',parameter_value)) AS  status_cb\n" +
                    "  FROM nrapp.vw_job_event_list t\n" +
                    "  LEFT\n" +
                    "  JOIN dma.dm_branch_d br\n" +
                    "    ON nvl(DECODE(parameter_name,'I_BRANCH_RK',parameter_value), 0) = br.branch_rk\n" +
                    "   AND date_begin BETWEEN br.data_actual_date and br.data_actual_end_date\n" +
                    "WHERE file_type like 'F110_KLIKO%'\n" +
                    "GROUP BY\n" +
                    "       file_id,\n" +
                    "       file_name,\n" +
                    "       file_status,\n" +
                    "       file_size,\n" +
                    "       date_begin,\n" +
                    "       date_end,\n" +
                    "       message\n" +
                    "ORDER BY file_id desc"

            JdbcDatasetInit.createJdbcDatasetQueryTypeInit("jdbcNRDemoKliko", kliko,"JdbcConnectionNRDemo")
            JdbcDatasetInit.loadAllColumnsJdbcDatasetInit("jdbcNRDemoKliko")
            DatasetComponentInit.createDatasetComponent("DatasetNRDemoKliko", "jdbcNRDemoKliko")
            DatasetComponentInit.createAllColumnNRDemoKliko("DatasetNRDemoKliko")


            String f110_codes = "select f110_code code_key, \n" +
                    "       f110_code code_value \n" +
                    "  from dma.dm_f110_code_s \n" +
                    " where sysdate between actual_date and actual_end_date \n"
             String f110_codes_bind = "   and nvl(:SECTIONS,'1,2,3,4') like '%'||to_char(section_number)||'%'  \n" +
                    " order by section_number, row_number\n"
            String f110_sections = "select distinct 'Раздел '||section_number as key, section_number as value from dma.dm_f110_code_s order by 1"

            JdbcDatasetInit.createJdbcDatasetQueryTypeInit("jdbcNRDemoF110Codes", f110_codes,"JdbcConnectionNRDemo")
            JdbcDatasetInit.loadAllColumnsJdbcDatasetInit("jdbcNRDemoF110Codes")
            DatasetComponentInit.createDatasetComponent("DatasetNRDemoF110Codes", "jdbcNRDemoF110Codes")
            DatasetComponentInit.createAllColumnNRDemoKliko("DatasetNRDemoF110Codes")
            JdbcDatasetInit.updateJdbcDataset("jdbcNRDemoF110Codes", f110_codes + f110_codes_bind)

            JdbcDatasetInit.createJdbcDatasetQueryTypeInit("jdbcNRDemoF110Sections",f110_sections,"JdbcConnectionNRDemo")
            JdbcDatasetInit.loadAllColumnsJdbcDatasetInit("jdbcNRDemoF110Sections")
            DatasetComponentInit.createDatasetComponent("DatasetNRDemoF110Sections", "jdbcNRDemoF110Sections")
            DatasetComponentInit.createAllColumnNRDemoKliko("DatasetNRDemoF110Sections")

            String dqc_tests = "select t.TEST_ID,\n" +
                    "       t.TEST_NUM,\n" +
                    "       t.TEST_TYPE,\n" +
                    "       t.TEST_NAME,\n" +
                    "       t.TEST_OBJECT,\n" +
                    "       t.PRIORITY,\n" +
                    "       t.JOB_STATE,\n" +
                    "       case\n" +
                    "         when t.job_state = 'RUNNING'\n" +
                    "         then 'ВЫПОЛНЯЕТСЯ'\n" +
                    "         else '<img src=\"#WORKSPACE_IMAGES#success-icon-3.png\" width=\"20\" height=\"20\" alt=\"' || \n" +
                    "              t.job_state || '\">'\n" +
                    "       end as RUN,\n" +
                    "       0 as show_log,\n" +
                    "       to_char(t.report_list) as report_list\n" +
                    "  from table( dqc.data_quality.getTests(V('APP_USER'), '110') ) t"

            JdbcDatasetInit.createJdbcDatasetQueryTypeInit("jdbcNRDemoF110DqcTests",dqc_tests,"JdbcConnectionNRDemo")
            JdbcDatasetInit.loadAllColumnsJdbcDatasetInit("jdbcNRDemoF110DqcTests")
            DatasetComponentInit.createDatasetComponent("DatasetNRDemoF110DqcTests", "jdbcNRDemoF110DqcTests")
            DatasetComponentInit.createAllColumnNRDemoDqc("DatasetNRDemoF110DqcTests")

            String dqc_view = "select t.TEST_SET_ID\n" +
                    "      ,t.TEST_SET_NAME\n" +
                    "      ,t.TEST_COUNT\n" +
                    "      ,t.DESCRIPTION\n" +
                    "      ,case\n" +
                    "         when t.job_state = 'RUNNING'\n" +
                    "         then 'ВЫПОЛНЯЕТСЯ'\n" +
                    "         else '<img src=\"#WORKSPACE_IMAGES#success-icon-3.png\" width=\"20\" height=\"20\" alt=\"' || \n" +
                    "              t.job_state || '\">'\n" +
                    "       end as RUN\n" +
                    "      ,t.JOB_STATE\n" +
                    "  from table ( DQC.DATA_QUALITY.getTestSets('110') ) t\n" +
                    " order\n" +
                    "    by t.TEST_SET_NAME"

            JdbcDatasetInit.createJdbcDatasetQueryTypeInit("jdbcNRDemoF110DqcView",dqc_view,"JdbcConnectionNRDemo")
            JdbcDatasetInit.loadAllColumnsJdbcDatasetInit("jdbcNRDemoF110DqcView")
            DatasetComponentInit.createDatasetComponent("DatasetNRDemoF110DqcView", "jdbcNRDemoF110DqcView")
            DatasetComponentInit.createAllColumnNRDemoDqcButtons("DatasetNRDemoF110DqcView", dqcRunTest, dqcShowTests)

            String dqc_journal = "select date_time,\n" +
                    "       test_id,\n" +
                    "       test_num,\n" +
                    "       test_name,\n" +
                    "       test_object,\n" +
                    "       internal_rk,\n" +
                    "       problem_id,\n" +
                    "       oper_date,\n" +
                    "       error_message,\n" +
                    "       user_object_id,\n" +
                    "       branch,\n" +
                    "       reason,\n" +
                    "       report_list,\n" +
                    "       priority\n" +
                    "  from table ( dqc.data_quality.getResults(  \n" +
                    "         null,\n" +
                    "         null,\n" +
                    "         to_date('2010-04-01','YYYY-MM-DD'),\n" +
                    "         to_date('2020-04-01','YYYY-MM-DD'),\n" +
                    "         '1'\n" +
                    "       ))\n" +
                    " order by date_time desc, priority asc"

            JdbcDatasetInit.createJdbcDatasetQueryTypeInit("jdbcNRDemoF110DqcJournal",dqc_journal,"JdbcConnectionNRDemo")
            JdbcDatasetInit.loadAllColumnsJdbcDatasetInit("jdbcNRDemoF110DqcJournal")
            DatasetComponentInit.createDatasetComponent("DatasetNRDemoF110DqcJournal", "jdbcNRDemoF110DqcJournal")
            DatasetComponentInit.createAllColumnNRDemoDqc("DatasetNRDemoF110DqcJournal")

            String dqc_history = "with\n" +
                    "wt_test_run_groups as\n" +
                    " (\n" +
                    "   select tr.test_set_run_id,\n" +
                    "          sum(tr.record_count) as error_count\n" +
                    "     from dqc.test_run tr\n" +
                    "    group by tr.test_set_run_id\n" +
                    " ),\n" +
                    " wt_test_set_run as\n" +
                    " (\n" +
                    "   select /*+ materialize*/\n" +
                    "          tsr.test_set_run_id\n" +
                    "         ,tsr.test_set_id\n" +
                    "         ,tsr.date_time\n" +
                    "         ,tsr.oper_date\n" +
                    "         ,tsr.branch\n" +
                    "         ,tsr.date_time_end\n" +
                    "         --,max(tsr.test_set_run_id) over (partition by tsr.oper_date, tsr.test_set_id) as max_test_set_run_id\n" +
                    "     from dqc.test_set_run tsr\n" +
                    "    where (\n" +
                    "            tsr.test_set_id = NV('P75_TEST_SET_ID')\n" +
                    "            or NV('P75_TEST_SET_ID') is null\n" +
                    "          )\n" +
                    " )\n" +
                    " select distinct\n" +
                    "        tsr.test_set_run_id,\n" +
                    "        tsr.date_time,\n" +
                    "        tsr.oper_date,\n" +
                    "        tsr.branch,\n" +
                    "        tsr.date_time_end,\n" +
                    "        tsr.test_set_id,\n" +
                    "        tsr.test_set_run_id as show_log,\n" +
                    "        ts.test_set_name,\n" +
                    "        ts.description,\n" +
                    "        null as error_count,\n" +
                    "        0 as show_history_run_test\n" +
                    "   from wt_test_set_run tsr\n" +
                    "   left\n" +
                    "   join dqc.test_set ts\n" +
                    "     on tsr.test_set_id = ts.test_set_id\n" +
                    "   join wt_test_run_groups trg\n" +
                    "     on trg.test_set_run_id = tsr.test_set_run_id\n" +
                    "   join dqc.test_x_test_set x\n" +
                    "     on ts.test_set_id = x.test_set_id\n" +
                    "   join dqc.report_influence ri\n" +
                    "     on x.test_id = ri.test_id\n" +
                    "   join nrsettings.st_report r\n" +
                    "     on r.report_id = ri.report_id\n" +
                    "  where 1 = 1\n" +
                    "    --and tsr.test_set_run_id = tsr.max_test_set_run_id\n" +
                    "    and x.is_active = 'Y'\n" +
                    "    and (\n" +
                    "          r.report_id = '110'\n" +
                    "          or '110' is null\n" +
                    "        )\n" +
                    "  order by date_time desc"

            JdbcDatasetInit.createJdbcDatasetQueryTypeInit("jdbcNRDemoF110DqcHistory",dqc_history,"JdbcConnectionNRDemo")
            JdbcDatasetInit.loadAllColumnsJdbcDatasetInit("jdbcNRDemoF110DqcHistory")
            DatasetComponentInit.createDatasetComponent("DatasetNRDemoF110DqcHistory", "jdbcNRDemoF110DqcHistory")
            DatasetComponentInit.createAllColumnNRDemoDqc("DatasetNRDemoF110DqcHistory")

            String dqc_test_set_tests = "select TEST_ID,\n" +
                    "       TEST_NUM,\n" +
                    "       TEST_TYPE,\n" +
                    "       TEST_NAME,\n" +
                    "       TEST_OBJECT,\n" +
                    "       PRIORITY,\n" +
                    "       0 as delete_row\n" +
                    "  from DQC.TEST t\n"
            String dqc_test_set_tests_bind =        " where t.test_id in ( SELECT TX.TEST_ID\n" +
                    "                       FROM DQC.TEST_X_TEST_SET TX\n" +
                    "                      WHERE TX.TEST_SET_ID = :TEST_SET_ID\n" +
                    "                        and tx.is_active = 'Y' )\n" +
                    " order by TEST_NAME"

            JdbcDatasetInit.createJdbcDatasetQueryTypeInit("jdbcNRDemoF110DqcTestsxTestSet",dqc_test_set_tests,"JdbcConnectionNRDemo")
            JdbcDatasetInit.loadAllColumnsJdbcDatasetInit("jdbcNRDemoF110DqcTestsxTestSet")
            DatasetComponentInit.createDatasetComponent("DatasetNRDemoF110DqcTestsxTestSet", "jdbcNRDemoF110DqcTestsxTestSet")
            DatasetComponentInit.createAllColumnNRDemoDqc("DatasetNRDemoF110DqcTestsxTestSet")

            /*JdbcDatasetInit.updateJdbcDataset("jdbcNRDemoF110DqcTestsxTestSet", dqc_test_set_tests + dqc_test_set_tests_bind)*/
        }
        catch (Throwable e) {
            logger.error("DatasetPackage", e)
        }

        /*NotificationPackage*/
        NotificationStatusInit.createNotificationStatus('Отчет не рассчитан','#cd5680')
        NotificationStatusInit.createNotificationStatus('Отчёт за дату проверен','#cd8056')
        NotificationStatusInit.createNotificationStatus('Отчёт не сдаётся из NR','#aaaaaa')
        NotificationStatusInit.createNotificationStatus('Расчет отчета за дату произведён','#56cd80')
        NotificationStatusInit.createNotificationStatus('Отчёт по нормативам за дату проверен','#5680cd')
        NotificationStatusInit.createNotificationStatus('Отчёт сдан в проверяющий орган','#8056CD')
        NotificationStatusInit.createNotificationStatus('Личная заметка','#ff57da')

        /*ApplicationPackage*/
        GradientStyleInit.createGradientStyle("Neoflex")
        TypographyStyleInit.createTypographyStyle("Title")

        YearBookInit.createWeekendYearBook("Календарь выходных дней")
        YearBookInit.createHolidaysYearBook("Календарь праздничных дней")
        YearBookInit.createWorkDaysYearBook("Календарь рабочих дней", "Календарь выходных дней", "Календарь праздничных дней")
        AppModuleInit.createAppModuleDashboard("Dashboard")
        GlobalSettingsInit.createGlobalSettings("Календарь рабочих дней", "Календарь выходных дней", "Календарь праздничных дней", "Dashboard")

        AppModuleInit.createAppModuleReportSingle("ReportSingle")
        NotificationInit.createNotification("A 1993", Periodicity.MONTH, "17",  "18", "15", "ReportSingle", "Отчет не рассчитан")

        NotificationInit.createNotification("A 1994", Periodicity.MONTH, "16",  "18", "15", "ReportSingle", "Отчёт сдан в проверяющий орган")
        NotificationInit.createNotification("A 1995", Periodicity.MONTH, "15",  "18", "14", "ReportSingle", "Расчет отчета за дату произведён")
        NotificationInit.createNotification("A 1996", Periodicity.MONTH, "14",  "18", "13", "ReportSingle", "Расчет отчета за дату произведён")

        NotificationInit.createEmptyNotification("Ф 2020", Periodicity.MONTH, "10",  "18", "8", "Отчёт не сдаётся из NR")
        NotificationInit.createEmptyNotification("Проверить почту", Periodicity.MONTH, "10",  "18", "8", "Личная заметка")
        NotificationInit.createNotification("Ф 230", Periodicity.MONTH, "9",  "18", "7", "ReportSingle", "Отчёт сдан в проверяющий орган")
        NotificationInit.createNotification("К 210", Periodicity.DAY, "9",  "18", "7", "ReportSingle", "Отчёт сдан в проверяющий орган")
        NotificationInit.createNotification("M 250", Periodicity.QUARTER, "9",  "18", "7", "ReportSingle", "Отчёт сдан в проверяющий орган")
        NotificationInit.createNotification("Я 666", Periodicity.YEAR, "9",  "18", "7", "ReportSingle", "Отчёт сдан в проверяющий орган")

        /*NRdemo*/
        def nrDemoSection1 = AppModuleInit.createAppModuleNRDemoMain("F110_Section1","Раздел I. Расшифровки, используемые для формирования бухгалтерского баланса (публикуемая форма)", "jdbcNRDemoSection1", "DatasetNRDemoSection1", true)
        def nrDemoSection2 = AppModuleInit.createAppModuleNRDemoMain("F110_Section2", "Раздел II. Расшифровки, используемые для формирования отчета о финансовых результатах (публикуемая форма)", "jdbcNRDemoSection2", "DatasetNRDemoSection2", true)
        def nrDemoSection3 = AppModuleInit.createAppModuleNRDemoMain("F110_Section3", "Раздел III. Расшифровки для расчета показателей, используемых для оценки финансовой устойчивости кредитных организаций", "jdbcNRDemoSection3", "DatasetNRDemoSection3", true)
        def nrDemoSection4 = AppModuleInit.createAppModuleNRDemoMain("F110_Section4", "Раздел IV. Расшифровки, используемые при расчете денежно-кредитных показателей", "jdbcNRDemoSection4", "DatasetNRDemoSection4", true)

        def nrDemoDetail = AppModuleInit.createAppModuleNRDemoDetail("F110_Detail", "Расшифровочный отчет", "jdbcNRDemoDetail", "DatasetNRDemoDetail", true)
        def nrDemoCalcMart = AppModuleInit.createAppModuleNRDemoCalcMart("F110_CalcMart", "Запуск расчета формы", "jdbcNRDemoCalcMart", "DatasetNRDemoCalcMart")
        def nrDemoKliko = AppModuleInit.createAppModuleNRDemoKliko("F110_KLIKO", "Выгрузка в KLIKO", "jdbcNRDemoKliko", "DatasetNRDemoKliko")

        AppModuleInit.createAppModuleNRDemoDqcTests("F110_DQC_TESTS", "Проверки", "jdbcNRDemoF110DqcTests", "DatasetNRDemoF110DqcTests",true)
        AppModuleInit.createAppModuleNRDemoDqcView("F110_DQC_VIEW",
                "Наборы проверок",
                "jdbcNRDemoF110DqcView",
                "DatasetNRDemoF110DqcView",
                true,
                dqcRunTest,
                dqcShowTests)

        AppModuleInit.createAppModuleNRDemoDqcJournal("F110_DQC_JOURNAL", "Журнал ошибок", "jdbcNRDemoF110DqcJournal", "DatasetNRDemoF110DqcJournal",true)
        AppModuleInit.createAppModuleNRDemoDqcHistory("F110_DQC_HISTORY", "История запуска наборов", "jdbcNRDemoF110DqcHistory", "DatasetNRDemoF110DqcHistory",true)


        NotificationInit.createNotification("Ф110", Periodicity.MONTH, "15", "17", "15", "F110_Section1", "Отчет не рассчитан")

        try {
            ApplicationInit.createApplication("Обязательная отчетность")
            ApplicationInit.createApplication("Налоговая отчетность")
            ApplicationInit.createApplication("Администрирование")
        }
        catch (Throwable e) {
            logger.error("Application was not created", e)
        }

        def referenceTree1 = AppModuleInit.makeRefTreeNRDemo()
        AppModuleInit.assignRefTreeNRDemo(nrDemoSection1 as AppModule, "F110_Section1", referenceTree1)
    }
}
