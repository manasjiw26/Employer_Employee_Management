import supabase from './config/supabase';

async function test() {
  try {
    const { data: payrolls, error: fetchErr } = await supabase
      .from('payrolls')
      .select('*');
    
    console.log('Current payrolls count:', payrolls?.length);
    if (fetchErr) throw fetchErr;

    if (payrolls && payrolls.length > 0) {
      const p = payrolls[0];
      console.log('Found payroll:', p);
      const nextMonth = p.month === 12 ? 1 : p.month + 1;
      const nextYear = p.month === 12 ? p.year + 1 : p.year;
      console.log(`Testing insert for profile_id: ${p.profile_id}, month: ${nextMonth}, year: ${nextYear}...`);

      const { data, error } = await supabase
        .from('payrolls')
        .insert({
          profile_id: p.profile_id,
          company_id: p.company_id,
          month: nextMonth,
          year: nextYear,
          base_salary: p.base_salary,
          bonuses: 0,
          deductions: 0,
          net_salary: p.base_salary,
          status: 'UNPAID'
        })
        .select();
      
      if (error) {
        console.error('Insert failed with error:', error);
      } else {
        console.log('Insert succeeded:', data);
        // clean up
        if (data && data[0]) {
          const clean = await supabase
            .from('payrolls')
            .delete()
            .eq('id', data[0].id);
          console.log('Cleanup result:', clean.error || 'Cleaned up successfully');
        }
      }
    } else {
      console.log('No payroll records exist in DB. Fetching employees to insert a test payroll...');
      const { data: employees, error: empErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'EMPLOYEE')
        .limit(1);

      if (empErr) throw empErr;
      if (employees && employees.length > 0) {
        const emp = employees[0];
        console.log('Found employee:', emp);
        console.log('Inserting first payroll...');
        const res1 = await supabase
          .from('payrolls')
          .insert({
            profile_id: emp.id,
            company_id: emp.company_id,
            month: 1,
            year: 2026,
            base_salary: 3000,
            bonuses: 0,
            deductions: 0,
            net_salary: 3000,
            status: 'UNPAID'
          })
          .select();
        
        console.log('First insert result:', res1.data, res1.error);
        if (res1.data && res1.data[0]) {
          console.log('Inserting second payroll for same employee, different month...');
          const res2 = await supabase
            .from('payrolls')
            .insert({
              profile_id: emp.id,
              company_id: emp.company_id,
              month: 2,
              year: 2026,
              base_salary: 3000,
              bonuses: 0,
              deductions: 0,
              net_salary: 3000,
              status: 'UNPAID'
            })
            .select();
          console.log('Second insert result:', res2.data, res2.error);

          // Cleanup
          await supabase.from('payrolls').delete().eq('profile_id', emp.id);
          console.log('Cleaned up payrolls');
        }
      } else {
        console.log('No employees found to test with.');
      }
    }
  } catch (err) {
    console.error('Error during test:', err);
  }
}

test();
