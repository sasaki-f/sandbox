const categorySearch=document.querySelector('#category-keyword');
categorySearch.removeEventListener('input',renderCategories);
categorySearch.placeholder='設備名で検索';categorySearch.setAttribute('aria-label','設備名を検索');
const collapsedCategories=new Set();let previousCategoryQuery='';let weeklyFromCategory=false;
renderCategories=function(){
  const query=categorySearch.value.trim().normalize('NFKC').toLocaleLowerCase();
  if(query!==previousCategoryQuery){collapsedCategories.clear();previousCategoryQuery=query}
  const groups=equipmentCategories.map(category=>({category,equipment:scheduleEquipment[category].filter(e=>e.name.normalize('NFKC').toLocaleLowerCase().includes(query))})).filter(group=>group.equipment.length);
  document.querySelector('#category-count').textContent=groups.reduce((count,group)=>count+group.equipment.length,0);
  const container=document.querySelector('#category-rows');container.replaceChildren();const columnCount=innerWidth>=1100?3:innerWidth>=600?2:1;const columns=Array.from({length:Math.min(columnCount,groups.length)},()=>{const column=document.createElement('div');column.className='category-stack';container.append(column);return column});let groupIndex=0;
  for(const {category,equipment} of groups){
    const group=document.createElement('section');group.className='category-group';
    const head=document.createElement('div');head.className='category-group-header';
    const link=document.createElement('button');link.type='button';link.className='category-name-link';link.textContent=category;link.onclick=()=>{weeklyFromCategory=false;showSchedule(category)};
    const count=document.createElement('span');count.className='category-equipment-count';count.textContent=equipment.length+'件';
    const toggle=document.createElement('button');toggle.type='button';toggle.className='category-fold';toggle.setAttribute('aria-label',category+'の設備一覧を開閉');toggle.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 9 7 7 7-7"/></svg>';
    const list=document.createElement('div');list.className='category-equipment-list';list.id='category-equipment-'+equipmentCategories.indexOf(category);list.hidden=collapsedCategories.has(category);toggle.setAttribute('aria-controls',list.id);toggle.setAttribute('aria-expanded',String(!list.hidden));
    toggle.onclick=()=>{list.hidden=!list.hidden;toggle.setAttribute('aria-expanded',String(!list.hidden));if(list.hidden)collapsedCategories.add(category);else collapsedCategories.delete(category)};
    for(const e of equipment){const item=document.createElement('button');item.type='button';item.className='category-equipment-link';const name=document.createElement('span');name.textContent=e.name;const arrow=document.createElement('span');arrow.className='equipment-row-arrow';arrow.textContent='›';item.append(name,arrow);item.onclick=()=>{showSchedule(category);showWeekly(e);weeklyFromCategory=true};list.append(item)}
    head.append(link,count,toggle);group.append(head,list);columns[groupIndex++%columns.length].append(group)
  }
  if(!groups.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='条件に一致する設備はありません';container.append(empty)}
};
categorySearch.addEventListener('input',renderCategories);
const leaveWeeklyToCategory=leaveWeekly;
leaveWeekly=function(){leaveWeeklyToCategory();if(weeklyFromCategory){weeklyFromCategory=false;leaveSchedule()}};
document.querySelector('#category-count').parentElement.setAttribute('aria-live','polite');
renderCategories();
document.querySelector('#new').addEventListener('click',()=>{collapsedCategories.clear();previousCategoryQuery='';weeklyFromCategory=false},true);

for(const breakpoint of ['(min-width:600px)','(min-width:1100px)'])window.matchMedia(breakpoint).addEventListener('change',()=>renderCategories());
